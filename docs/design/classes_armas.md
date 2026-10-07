# Classes, fusões e árvore de armas

> **Status:** decidido (2026-10-07), à espera de implementação. Regras gerais em
> [pos_cubo.md](pos_cubo.md); Dons em [dons.md](dons.md).

A tela de evolução tem **três abas**: **Classes** (a teia abaixo), **Dom** (a árvore do Dom do
personagem) e **Armas** (estilo XCOM). Os pontos de habilidade são os mesmos para as três.
Quem não tem Dom usa só Classes e Armas.

## Teia de classes

```
                         IMPACTO (N)
              Duelista · Caçador │ Demolidor · Artilheiro
                      ╲         │         ╱
        NO  Controle × Impacto  │  Impacto × Movimento  NE
                        ╲       │       ╱
 CONTROLE (O) ──────────────────●────────────────── MOVIMENTO (L)
 Restritor · Manipulador        │        Corredor · Acrobata
 Supressor · Perturbador        │        Batedor · Infiltrador
                        ╱       │       ╲
        SO  Suporte × Controle  │  Movimento × Suporte  SE
                      ╱         │         ╲
            Guardião · Estrategista │ Resgatista · Socorrista
                          SUPORTE (S)
```

Cada classe tem 4 subclasses: **duas viradas para cada vizinha**. As fusões ficam nas diagonais
e juntam uma subclasse de cada lado. Cada fusão **traz uma regra nova** (não soma bônus).

### Subclasses

| Classe | Subclasse | Lado | Papel |
|---|---|---|---|
| Impacto | **Demolidor** | NE | Dano bruto corpo a corpo; destrói cobertura e paredes. |
| Impacto | **Artilheiro** | NE | Dano à distância em área; explosões. |
| Impacto | **Duelista** | NO | Um contra um; contra-ataca quem o ataca de perto. |
| Impacto | **Caçador** | NO | Finaliza alvos feridos, marcados ou presos. |
| Movimento | **Corredor** | NE | Velocidade e investidas em linha reta. |
| Movimento | **Acrobata** | NE | Saltos, altura, esquiva; ignora terreno. |
| Movimento | **Batedor** | SE | Reconhecimento, visão longa, abre caminho para o squad. |
| Movimento | **Infiltrador** | SE | Furtividade e flanco; não provoca ao sair do lado. |
| Suporte | **Resgatista** | SE | Carrega caídos e civis sem penalidade; evacuação. |
| Suporte | **Socorrista** | SE | Cura, estabiliza, limpa estados. |
| Suporte | **Guardião** | SO | Escudos, intercepta golpes de aliados ao lado. |
| Suporte | **Estrategista** | SO | Ordens: adianta a barra de ação de aliados, bônus de equipe. |
| Controle | **Restritor** | NO | Imobiliza, agarra, prende. |
| Controle | **Manipulador** | NO | Empurra, puxa e reposiciona (aliados e inimigos). |
| Controle | **Supressor** | SO | Negação de área, supressão, zonas. |
| Controle | **Perturbador** | SO | Estados: confusão, silêncio, atraso na barra de ação. |

### Fusões (8)

| Diagonal | Fusão | Subclasses | Regra nova |
|---|---|---|---|
| NE | **Aríete** ("RAM") | Demolidor + Corredor | Dano cresce com as casas percorridas antes do golpe (`dano = base + casas × multiplicador`); atravessa o alvo se ele cair. |
| NE | **Bombardeiro** | Artilheiro + Acrobata | Ataca de cima depois de um salto: a área ganha +1 de raio a cada 2 níveis de altura acima do alvo. |
| SE | **Extrator** | Infiltrador + Resgatista | Pega um aliado caído ou civil e sai no mesmo turno sem provocar ataques nem ser visto. |
| SE | **Paramédico de Campo** | Batedor + Socorrista | Mover até um caído e estabilizá-lo é uma ação só; ganha deslocamento indo na direção de aliados feridos. |
| SO | **Muralha** | Guardião + Supressor | Cria uma zona: inimigos não entram sem parar o movimento; aliados dentro têm meia cobertura. |
| SO | **Maestro** | Estrategista + Perturbador | Reordena a linha do tempo: troca a posição de um aliado e de um inimigo na fila de ação. |
| NO | **Grappler** | Manipulador + Duelista | Puxa o alvo para o lado e o golpeia na mesma ação; o golpe arremessa. |
| NO | **Executor de Contenção** | Restritor + Caçador | Alvo imobilizado recebe dano adicional e não pode ser resgatado por aliados dele. |

Requisitos de fusão (configuráveis): nível ≥ 15, ≥ 20% de investimento em cada subclasse,
3 técnicas com Maestria ≥ 25.

### Afinidade

Todo recruta tem afinidade 0–100 com cada classe (gerada pela origem e pelos atributos). A
afinidade **não bloqueia**: muda o custo dos nós, o ganho de Maestria e a eficiência inicial.

## Árvore de armas (estilo XCOM)

Para todos, com ou sem Dom. Seis ramos; o personagem escolhe um ramo principal (a arma que
carrega) e pode pegar nós soltos de outro.

| Ramo | Armas | Identidade | Exemplos de nós |
|---|---|---|---|
| **Sniper** | Fuzil de precisão, pistola | Longe e no alto; tiro decisivo | Tiro mirado (gasta a ação inteira, crítico alto), Prontidão de longe, Tiro na perna (imobiliza), Bala que atravessa |
| **Assalto** | Fuzil, escopeta | Perto, mobilidade, pressão | Correr e atirar, Tiro à queima-roupa, Fogo contínuo (supressão), Rajada |
| **Pesado** | Metralhadora, lança-granadas | Área, cobertura destruída | Supressão pesada, Granada, Demolição (derruba paredes), Chuva de balas |
| **Especialista** | Pistola, drone, ferramentas | Tecnologia e armadilhas | Drone (cura ou ataca à distância), Hackear (torres, portas, câmeras), Armadilhas (mina, rede, choque), Interferência |
| **Artes Marciais** | Punhos (soco-inglês, luvas) ou mãos vazias | O corpo é a arma | Sequência de Golpes (3 socos), Postura de Combate (+esquiva), Projeção (derruba e lança 2 casas), Contra-ataque (50% contra golpe corpo a corpo), Punho Final (atravessa a guarda e lança 3 casas) |
| **Armas Brancas** | Lâminas (faca, facão, katana, machado, lança) e contundentes (cano, taco, marreta) | Cortes, investidas, giros | Corte Rápido (sangra; ação rápida), Aparar (35%: metade do dano), Investida Cortante (atravessa a linha), Ritmo da Lâmina (+crítico e flanco), Turbilhão de Aço (3×3 ao redor, sangra) |

Sem arma equipada, o combatente luta com os punhos (as Artes Marciais valem desarmado). Armas de fogo usam **munição** (recarregar gasta a ação). Granadas e armadilhas têm usos por missão.

Sem Dom não é ser menos: a árvore de armas tem o mesmo número de nós e de "momentos decisivos"
que a do Dom (tiro mirado, chuva de balas, drone, armadilha).

## O Dom do protagonista

- Escolhido no início entre os **10 Dons de famílias não anômalas** de [dons.md](dons.md).
- Potencial **aparente ★★★**; o **real é ★★★★★** e se revela ao longo da campanha ("Dom ainda não
  completamente desenvolvido" — cenário §27).
- Nenhum Dom é exclusivo: recrutas podem ter o mesmo Dom do protagonista e jogar diferente.
- Os 5 amigos criados pelo jogador: cada um pode ter Dom (escolhido entre os 10) ou não ter; ao
  menos dois sem Dom, para o grupo refletir a vila (cenário §26).
