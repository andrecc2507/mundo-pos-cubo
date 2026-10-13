# Árvore do Combatente

> Quem luta sem Dom (ou além dele): cinco ramos de arma, sete habilidades cada, níveis 1, 3, 5, 8, 11, 14 e 18. Cada ramo tem personalidade própria — ritmo, paciência, peso, engenhoca, aço. Aqui estão os rascunhos para você editar; o jogo lê os mesmos dados de `src/game/data/skills/trees/armas.json`.

**Regras que valem para todos os ramos**

* O dano da arma é **fixo da arma** (+ bônus de nível); **DES só melhora pontaria** e alcance eficaz. Armas corpo a corpo somam FOR.
* Habilidades de ramo exigem a arma indicada na mão (os passivos funcionam sempre).
* O custo é energia (MP, que cresce com VON) e recarga em turnos. Técnicas de área: quem se esquiva leva metade do dano.

## Sniper

Longe, parado e sem pressa. O tiro que decide a conversa. (Fuzil de precisão ou pistola.)

| Nv | Habilidade | Tipo | Custo | Efeito |
|---|---|---|---|---|
| 1 | **Tiro Mirado** | tiro | 3 MP · recarga 1 | Prende a respiração e gasta o turno inteiro. Dois segundos de silêncio, um tiro: +15 de acerto e +20% de crítico. |
| 3 | **Olho de Falcão** | passiva | — | Quem enxerga longe atira longe: o tiro básico alcança 2 casas a mais. |
| 5 | **Tiro na Perna** | tiro | 4 MP · recarga 2 | Ninguém corre com um joelho a menos. Imobiliza o alvo por 1 turno. |
| 8 | **Paciência** | passiva | — | Quem espera, vê. Enxerga os escondidos e ganha +10 de acerto se não saiu do lugar neste turno. |
| 11 | **Tiro na Cabeça** | tiro | 8 MP · recarga 4 | Mira onde dói de verdade: ignora metade da armadura e tem +40% de crítico. |
| 14 | **Bala Fantasma** | tiro | 7 MP · recarga 3 | A bala faz a curva. Ignora linha de visão e cobertura de um alvo que o grupo já viu. |
| 18 | **Último Argumento** ★ | tiro | 10 MP · recarga 5 | Uma bala, assunto encerrado. Ignora 60% da armadura, +50% de crítico e acaba com quem estiver abaixo de 15% da vida. |

## Assalto

Perto, rápido e sem pedir licença. Quem para, vira alvo. (Fuzil ou escopeta.)

| Nv | Habilidade | Tipo | Custo | Efeito |
|---|---|---|---|---|
| 1 | **Correr e Atirar** | tiro | 3 MP · recarga 1 | Atira sem frear a perna: a próxima vez chega na metade do tempo. |
| 3 | **Pé Leve** | passiva | — | Dá um passo a mais que o resto: +1 de deslocamento. |
| 5 | **Rajada** | tiro | 4 MP · recarga 2 | Dois tiros colados, uma bala de munição só. Educado é gastar pouco. |
| 8 | **Sangue Frio** | passiva | — | Bala assobiando é só trânsito: recebe 15% menos dano de tiros. |
| 11 | **Chute na Porta** | golpe | 4 MP · recarga 3 | Coronhada na cara, empurrão e chão: o alvo é jogado 1 casa para trás e cai. |
| 14 | **Fogo e Manobra** | tiro | 5 MP · recarga 3 | Atira e já sai de onde estava: ganha mais um deslocamento completo. |
| 18 | **Queima-roupa** ★ | tiro | 8 MP · recarga 4 | Dentro da guarda dele, onde não tem erro: dois tiros a até 2 casas, +40% de crítico. |

## Pesado

Peso é argumento. Segura a linha, vira o campo do avesso. (Metralhadora ou lança-granadas.)

| Nv | Habilidade | Tipo | Custo | Efeito |
|---|---|---|---|---|
| 1 | **Supressão Pesada** | tiro | 3 MP · recarga 1 | Chumbo na frente do nariz do alvo: se ele se mexer, leva tiro. |
| 3 | **Granada** | tiro | 5 MP · recarga 2 | Pino fora, problema de outro. Explosão 3×3 a até 6 casas; arrasa cobertura. |
| 5 | **Couraça** | passiva | — | Anda como tanque: 15% menos dano físico e ninguém derruba. |
| 8 | **Teimoso** | passiva | — | Já devia estar no chão e não está. Uma vez por batalha, sobrevive a um golpe fatal com 1 de vida. |
| 11 | **Demolição** | tiro | 6 MP · recarga 3 | Parede é só um convite. Derruba tudo numa área 3×3; quem estava atrás sente. |
| 14 | **Chuva de Balas** | tiro | 8 MP · recarga 4 | Varre tudo à frente num cone. Não mira: espalha. |
| 18 | **Barragem** ★ | tiro | 12 MP · recarga 5 | Fecha a rua: bombardeio 5×5 a até 7 casas, destrói cobertura e joga todo mundo para longe do centro. |

## Especialista

Cinto cheio, cabeça fria. Resolve a luta antes de ela começar. (Qualquer arma.)

| Nv | Habilidade | Tipo | Custo | Efeito |
|---|---|---|---|---|
| 1 | **Drone de Cura** | cura | 4 MP · recarga 1 | Um zumbido que cuida: cura 18% da vida de um aliado a até 7 casas. |
| 3 | **Mina de Choque** | utilidade | 4 MP · recarga 2 | Presente para quem pisar: dano e atordoamento. Arma na hora, sem gastar o turno inteiro. |
| 5 | **Hackear** | técnica | 5 MP · recarga 3 | Desliga o alvo por 2 turnos: sem Dom e sem técnicas. |
| 8 | **Gambiarra** | passiva | — | Peça de sobra vira vantagem: cada mina sua que dispara devolve 3 de energia. |
| 11 | **Pulso de Interferência** | técnica | 8 MP · recarga 4 | Estática em todo o campo: silencia todos numa área 5×5 por 1 turno. |
| 14 | **Cortina de Fumaça** | utilidade | 3 MP · recarga 2 | Some do mapa: fumaça 3×3 que atrapalha a mira de quem atira através dela. |
| 18 | **Enxame de Reparo** ★ | cura | 10 MP · recarga 5 | Larga um enxame de drones: cura 25% da vida e limpa os estados de todo mundo numa área 5×5. |

## Armas Brancas

Perto o bastante para sentir o cheiro. Aço, ritmo e sangue-frio. (Lâmina ou arma contundente.)

| Nv | Habilidade | Tipo | Custo | Efeito |
|---|---|---|---|---|
| 1 | **Corte Rápido** | golpe | 3 MP · recarga 1 | Rápido e feio: abre um corte (sangramento por 2 turnos) e a próxima vez chega na metade do tempo. |
| 3 | **Aparar** | passiva | — | Pega o golpe no cabo: 35% de chance de levar só metade do dano de golpe corpo a corpo. |
| 5 | **Investida Cortante** | golpe | 5 MP · recarga 3 | Atravessa até 4 casas em linha, cortando todo mundo que estiver no caminho. |
| 8 | **Ritmo da Lâmina** | passiva | — | Luta em dupla: +10% de crítico e +15% de dano quando um aliado também está ao lado do alvo. |
| 11 | **Golpe de Misericórdia** | golpe | 5 MP · recarga 2 | Quem já sangra desiste: 60% a mais de dano contra alvo sangrando. |
| 14 | **Quebra-Guarda** | golpe | 6 MP · recarga 3 | Amassa a armadura até ela virar enfeite: ignora 70% da defesa e deixa o alvo com a armadura quebrada por 2 turnos. |
| 18 | **Turbilhão de Aço** ★ | golpe | 10 MP · recarga 4 | Gira a arma como quem arruma a casa: acerta todos em volta (3×3) e faz sangrar. |

★ = habilidade suprema do ramo (nível 18).
