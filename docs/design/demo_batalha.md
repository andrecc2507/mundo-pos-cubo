# Demo de batalha — o molde jogável

Primeira fatia jogável do Mundo Pós-Cubo: **montar o esquadrão e lutar**. Ainda não tem campanha,
missões, globo nem vila. Para abrir: menu principal → **⚔ Demo de batalha**.

## O que dá para fazer

1. **Montar até 6 heróis** (cena `demo`, `src/game/scenes/demo/demo.scene.ts`):
   - **Classe**: Impacto, Movimento, Suporte ou Controle. Trocar de classe devolve os pontos de
     habilidade.
   - **Nível** de 1 a 30. Mudar o nível remonta atributos e habilidades sozinho, e depois dá para
     ajustar à mão.
   - **Dom**: os 179 do catálogo, com busca e filtro por família e raridade. Também dá para sortear
     pela raridade (como no recrutamento) ou ficar **sem Dom**.
   - **Potencial ★1–5**: limita quantas técnicas ativas do Dom cabem (`potentialSlots` em
     `gift_rules.json`). As passivas não contam.
   - **Equipamento moderno**: pistolas, fuzis, escopeta, precisão, metralhadora, lança-granadas,
     punhos e lâminas; colete, armadura pesada ou traje de herói; até 3 itens (kit médico,
     granadas e estimulante).
   - **Atributos livres**: na demo, + e − valem à vontade, sem a trava de "salvar" da campanha.
   - **As três árvores**, que dividem os mesmos pontos:
     - **Classes**: a teia única. A sua classe vem primeiro; subclasses de outra classe pedem
       treino cruzado (NV 5). As fusões aparecem no fim.
     - **Dom**: a passiva inata mais 4 filosofias (Impacto, Movimento, Suporte, Controle) com 3
       técnicas cada; mostra Strain e custo.
     - **Armas**: Sniper, Assalto, Pesado e Especialista. Avisa quando uma técnica pede outro tipo
       de arma.
   - Clique numa habilidade para ver o que ela faz e por que está trancada. Clicar de novo, se ela
     estiver disponível, aprende. **⚙ Montar automático** refaz a build.
   - O esquadrão fica guardado neste navegador (`localStorage`).
2. **O bando** (`src/game/demo/demo_squad.ts`):
   - Vilões com Dons, que seguem as mesmas regras e árvores dos heróis.
   - Um **chefe** com Dom ★5 e nível +2.
   - **Feras alteradas** pelo Cubo.
   - O número de vilões é ajustável.
3. **A luta** acontece num cruzamento urbano (`src/game/mapgen/urban.ts`):
   - avenida, rua transversal e calçadas;
   - prédios com andares, janelas e telhado, que podem ser destruídos;
   - carros que explodem, barreiras de concreto, lixeiras e caixas.

## Regras da luta (XCOM/Xenonauts)

- **Turnos por time**: o esquadrão inteiro age, depois o bando inteiro.
- Cada herói tem **2 ações**:
  - andar até o deslocamento custa 1 ação;
  - correr até o dobro custa as 2;
  - atacar ou usar uma técnica encerra o turno;
  - técnicas de "meia ação" não encerram o turno.
- Dá para **trocar de herói** clicando nele, e **⏩ Fim do turno** encerra a vez do esquadrão.
- **Cobertura e flanco**: atacar por um lado sem cobertura dá crítico extra.
- **Munição**: cada arma tem um pente; recarregar gasta a ação. O alcance muda a precisão de cada
  tipo de arma.

## O feeling Boku no Hero

- **Strain**: cada técnica do Dom soma Strain.
  - Usar o Dom em sequência acumula: só cai `decayActive` por turno. Descansar esfria
    (`decayPerTurn`).
  - A partir de 75 vem o **ALÉM DO LIMITE!**: as técnicas do Dom batem 25% mais forte.
  - Em 100 vem o **Overload** próprio do Dom, que tem um custo de verdade.
- **Despertar**: só com potencial ★4+.
  - Acontece com Strain alto e um aliado caído perto (ou a vida baixa).
  - O Dom desperta no meio da luta, uma vez por batalha.
  - Ganha uma passiva que muda uma regra, as técnicas ficam mais fortes e baratas, e o herói ganha
    uma ação na hora.
- **Gritos de golpe**: o nome do finalizador (a suprema do Dom) e os momentos do Dom (além do
  limite, Overload, Despertar) aparecem numa faixa diagonal enorme, com tremor de tela.
- **Impulso**: a técnica de Suporte do Dom devolve 1 ação a um aliado, mesmo que ele já tenha
  encerrado o turno. É o "vai, eu seguro!".
- **Falas**:
  - o chefe provoca no começo;
  - o bando reage quando um vilão cai;
  - o chefe muda de tom quando fica abaixo da metade da vida;
  - os heróis têm traço de personalidade e falam nos momentos certos.
- **Ficha na batalha**: Dom, potencial, barra de Strain (vermelha além do limite), Stamina e o
  estado desperto.

## Números

| O quê | Onde |
|---|---|
| Esquadrão inicial, nomes, armas dos vilões, falas e tamanho do bando | `src/game/data/demo/demo.json` |
| Strain, Overload, Despertar e arquétipos das técnicas | `src/game/data/gifts/gift_rules.json` |
| Armas modernas e flanco | `balance.json → weapons` |

## Testes

- `tests/game/demo.test.ts` cobre:
  - o esquadrão inicial;
  - o limite do potencial;
  - o mapa urbano conectado e com cobertura;
  - o bando;
  - o setup da batalha.
- `tests/game/demo_battle.test.ts` roda lutas inteiras com a IA nos dois lados. Elas precisam
  terminar e usar as técnicas de Dom.

## Próximos passos sugeridos

- Ajustar o equilíbrio jogando de verdade:
  - na simulação IA × IA o bando de mesmo tamanho vence um pouco mais (o chefe é forte);
  - o dano das técnicas finais pode precisar de ajuste.
- Animações próprias dos golpes de Dom (hoje usam as animações do molde por elemento).
- Civis para resgatar no meio da luta (o motor já tem VIP e objetivos de interagir).
- Maestria por uso e variantes das técnicas (fase 4 de [pos_cubo.md](pos_cubo.md)).
