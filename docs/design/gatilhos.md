# História e gatilhos — manual de quem escreve

A história do jogo base é escrita num arquivo só, sem programar:
[`src/game/data/story/triggers.json`](../../src/game/data/story/triggers.json). O motor que lê o
roteiro é `src/game/geo/story.ts` (módulo puro, sem tela). A tela do hub mostra os diálogos com
retrato e o quadro de **Objetivos**.

## Como funciona

1. O jogo avisa um **acontecimento**: começou o jogo, virou o dia, um contrato foi cumprido, a vila
   foi atacada, uma obra ficou pronta…
2. Cada **gatilho** que escuta esse acontecimento confere as **condições** dele.
3. Se todas valem, o gatilho roda as **ações**: mostrar um diálogo, ligar uma flag, ativar um
   objetivo, dar recursos, trazer alguém para o grupo, criar um contrato da história…

Um gatilho dispara **uma vez só**, a não ser que tenha `"once": false`.

```json
{
  "id": "t_radio_bando",
  "on": "day",
  "if": [{ "day": [2] }],
  "do": [{ "dialog": "d_radio_bando" }, { "objective": "obj_cerco" }, { "flag": "aviso_bando" }]
}
```

Leitura: “num dia novo, a partir do dia 2, mostre o diálogo do rádio, ative o objetivo de cercar a
vila e lembre que o aviso foi dado”.

### Campos do gatilho

| Campo | O que é |
|---|---|
| `id` | Nome único do gatilho (aparece nos erros da conferência). |
| `on` | O acontecimento que ele escuta (tabela abaixo). |
| `match` | Opcional: só este id do acontecimento (qual obra, pesquisa, objetivo, contrato…). |
| `if` | Opcional: lista de condições. **Todas** precisam valer. |
| `do` | Lista de ações, na ordem. |
| `once` | Padrão `true`. Com `false`, dispara toda vez que as condições valerem. |
| `draft` | Rascunho: o jogo ignora. Bom para guardar ideias no próprio arquivo. |

## Acontecimentos (`on`)

| `on` | Quando | `id` (para `match`) | `{evento}` no texto |
|---|---|---|---|
| `start` | Novo jogo criado | — | — |
| `day` | Virou o dia (meia-noite) | — | — |
| `contract_done` | Contrato cumprido | chave da história ou tipo (`resgate`, `escolta`…) | título do contrato |
| `contract_failed` | Contrato perdido (derrota ou fuga) | chave da história ou tipo | título do contrato |
| `raid_start` | Ataque à vila começou | `bando`, `bestas` ou `expedicao` | — |
| `raid_won` | A vila resistiu | `batalha` ou `auto` | — |
| `raid_lost` | A vila caiu | `batalha` ou `auto` | — |
| `building_done` | Obra pronta (muros e cercas não contam) | id da construção (`horta`, `torre`…) | nome da construção |
| `research_done` | Pesquisa concluída | id do projeto (`fortificacao`, `cubo`…) | nome do projeto |
| `hired` | Recruta contratado | id do personagem | nome |
| `death` | Alguém do grupo morreu | id do personagem | nome |
| `level_up` | Alguém subiu de nível | id do personagem | nome |
| `stage_up` | A vila subiu de estágio | — | — |
| `objective_done` | Objetivo cumprido | id do objetivo | — |
| `choice` | Escolha feita num diálogo | `diálogo:índice` (ex.: `d_iracema:0`) | — |

Os ids das construções estão em `data/geo/village_layout.json`; os das pesquisas, em
`data/geo/research.json`; os tipos de contrato, em `data/geo/contracts.json`.

## Condições (`if`)

Cada condição é um objeto; se tiver várias chaves, todas precisam valer.

| Condição | Exemplo | Vale quando |
|---|---|---|
| `flag` | `{ "flag": "aviso_bando" }` / `{ "flag": "!aviso_bando" }` | A flag está ligada (com `!`, desligada). |
| `day` | `{ "day": [5] }` / `{ "day": [5, 9] }` | Dia do jogo ≥ 5 (ou entre 5 e 9). |
| `money` | `{ "money": [300] }` | Dinheiro ≥ 300 (ou entre os dois números). |
| `food` | `{ "food": [0, 20] }` | Comida entre 0 e 20. |
| `population` | `{ "population": [40] }` | Moradores ≥ 40. |
| `facility` | `{ "facility": ["horta", 1] }` | Instalação pronta com nível ≥ 1. |
| `building` | `{ "building": ["casa", 4] }` | Ao menos 4 construções desse tipo prontas e inteiras. |
| `placed` | `{ "placed": ["horta", 1] }` | Ao menos 1 posta na planta (pronta ou ainda em obra). |
| `research` | `{ "research": "fortificacao" }` | Pesquisa concluída. |
| `researchAny` | `{ "researchAny": true }` | Alguma pesquisa em andamento ou concluída. |
| `stage` | `{ "stage": 1 }` | Estágio da vila ≥ 1 (0 Vila … 3 Base Militar). |
| `contractsDone` | `{ "contractsDone": 3 }` | Contratos cumpridos ≥ 3. |
| `kills` | `{ "kills": 20 }` | Inimigos derrubados no jogo todo ≥ 20. |
| `dead` | `{ "dead": 1 }` | Nomes no memorial ≥ 1. |
| `enclosed` | `{ "enclosed": true }` | A vila está toda cercada (`false`: aberta). |
| `squads` | `{ "squads": 1 }` | Esquadrões fora da vila ≥ 1. |
| `roster` | `{ "roster": 12 }` | Pessoas no grupo ≥ 12. |
| `objective` | `{ "objective": "obj_cerco" }` / `{ "objective": "done:obj_cerco" }` | Objetivo ativo (ou cumprido). |
| `chance` | `{ "chance": 0.3 }` | Sorte: 30% (com o sorteio do jogo, igual em cada save). |
| `any` | `{ "any": [{ "day": [10] }, { "dead": 1 }] }` | Pelo menos uma das condições da lista. |
| `not` | `{ "not": { "enclosed": true } }` | A condição de dentro **não** vale. |

Dica: um gatilho com `"on": "day"` e uma condição é o jeito de “esperar até que algo aconteça” —
ele confere a cada dia e dispara no primeiro em que tudo vale.

## Ações (`do`)

| Ação | Exemplo | O que faz |
|---|---|---|
| `dialog` | `{ "dialog": "d_inicio" }` | Põe o diálogo na fila da tela. |
| `flag` | `{ "flag": "aceitou" }` / `{ "flag": { "confianca": 2 } }` | Liga uma flag (ou guarda um número). |
| `unflag` | `{ "unflag": "aceitou" }` | Desliga a flag. |
| `objective` | `{ "objective": "obj_cerco" }` | Ativa um objetivo (se já existe, nada muda). |
| `complete` | `{ "complete": "obj_cerco" }` | Dá o objetivo por cumprido (com a recompensa). |
| `give` | `{ "give": { "money": 50, "food": 20, "population": 3, "supplies": { "pecas": 2 }, "items": { "kit_medico": 1 } } }` | Dá (ou tira, com número negativo) dinheiro, comida, moradores, suprimentos e itens. |
| `log` | `{ "log": "Iracema foi embora." }` | Linha no registro da vila. |
| `alert` | `{ "alert": "🏘 Três famílias chegaram a {vila}." }` | Aviso no feed do hub. |
| `recruit` | ver abaixo | Personagem da história entra no grupo. |
| `contract` | ver abaixo | Contrato da história aparece no globo. |
| `raidIn` | `{ "raidIn": 12 }` | Ataque à vila daqui a 12 horas (ou antes, se já estava marcado). |

Suprimentos: `combustivel`, `remedios` e `pecas`. Itens: ids de `data/items/`.

### Personagem da história (`recruit`)

```json
{ "recruit": { "name": "Tomé", "classId": "controle", "gift": "bioluminescencia", "potential": 4, "nickname": "Farol", "bio": "Irmão de Iracema." } }
```

- `classId`: `impacto`, `movimento`, `suporte` ou `controle`.
- `gift`: id de um Dom de `data/gifts/gifts.json` (ou `null`). O potencial aparece aberto.
- `level`: opcional. Sem ele, entra no nível médio do grupo.
- Vem com arma da classe, colete e kit médico. Não cobra contratação.
- `appearance` (opcional) usa o mesmo formato da personalização.

### Contrato da história (`contract`)

```json
{ "contract": { "type": "resgate", "key": "irmao_luz", "title": "Resgate: o irmão de Iracema", "hours": 120, "money": 120 } }
```

- É um contrato normal do tipo pedido, com ⭐ no nome.
- `key` é a chave da história: cumprido, ele avisa `contract_done` com `id` = `key` (perdido ou
  vencido, `contract_failed`). Use a chave no `match` do gatilho seguinte.
- Opcionais: `title`, `level` (nível dos inimigos), `money`, `hours` (prazo) e `near`
  (`false` = em qualquer lugar do continente; padrão, perto da vila).

## Diálogos

```json
"d_iracema": {
  "title": "Iracema",
  "lines": [
    { "who": "vila", "text": "Uma mulher atravessa o portão e pede para falar com quem manda." },
    { "who": "Iracema", "text": "Levaram meu irmão, Tomé." }
  ],
  "choices": [
    { "text": "Vamos buscar o Tomé.", "do": [{ "contract": { "type": "resgate", "key": "irmao_luz" } }] },
    { "text": "Não temos gente para isso agora.", "do": [{ "flag": "recusou_iracema" }] }
  ]
}
```

- **Quem fala (`who`):**
  - `protagonista`: o protagonista, com retrato.
  - `amigo:1` … `amigo:5`: os 5 amigos, na ordem da criação, com retrato. Se o amigo morreu, outro
    amigo vivo fala no lugar (escreva falas que sirvam a qualquer um deles).
  - `personagem:<id>`: alguém do grupo pelo id (retrato).
  - `radio`: o rádio (📻).
  - `vila`: a gente da vila (🏘) — também serve de narrador.
  - Qualquer outro texto é um nome livre (💬), como `"Iracema"`.
- **Tela:** uma fala por vez, com **Continuar** e **Pular**. O relógio para enquanto o diálogo está
  aberto e volta à velocidade de antes quando ele fecha.
- **Escolhas:** aparecem depois da última fala; o diálogo só fecha escolhendo. Cada escolha roda as
  ações dela e avisa `choice` com o id `diálogo:índice` (a primeira é `0`).
- Vários diálogos na fila aparecem um depois do outro. Num ataque à vila, o diálogo vem antes da
  janela da defesa.

## Objetivos

```json
"obj_horta": {
  "title": "Plante a primeira horta",
  "desc": "Abra a Vila (tecla V), escolha Produção → Hortas e criação e posicione o canteiro.",
  "done": [{ "placed": ["horta", 1] }],
  "reward": { "money": 60 },
  "next": ["obj_contrato", "obj_pesquisa"]
}
```

- Ficam no quadro **🎯 Objetivos**, no canto direito do hub (clique no título para recolher).
- `done`: condições (mesmas da tabela); quando todas valem, o objetivo é cumprido na hora.
- `reward`: o mesmo formato de `give`. Aparece no quadro antes de cumprir.
- `next`: objetivos que entram quando este for cumprido.
- Cumprido, ele fica marcado ☑ por 12 horas de jogo e sai do quadro. Também avisa
  `objective_done` (para um diálogo de reação, por exemplo).
- Escreva a `desc` como instrução: onde clicar e o que fazer. Ela é o tutorial da primeira hora.

## Marcadores do texto

Valem nas falas, títulos, escolhas, `log` e `alert`.

| Marcador | Vira |
|---|---|
| `{protagonista}` | Nome do protagonista. |
| `{vila}` | Nome da vila. |
| `{amigo1}` … `{amigo5}` | Nome de cada amigo. |
| `{regiao}` | Região da vila. |
| `{governo}` | Governo da região da vila. |
| `{evento}` | Nome (ou id) do que disparou: quem morreu, qual obra, qual contrato… |
| `{dia}` | Dia do jogo. |
| `{fora}` | Quantas pessoas do grupo estão fora da vila. |

## Conferência do roteiro

`npm test` confere o roteiro inteiro (`validateScript` em `geo/story.ts`) e aponta, com o nome do
gatilho, diálogo ou objetivo:

- diálogo, objetivo, construção, instalação, pesquisa, Dom, item ou tipo de contrato que não existe;
- condição, ação ou acontecimento escrito errado;
- `amigo:` fora de 1–5 e marcador desconhecido;
- id de gatilho repetido, gatilho sem ações, objetivo sem condição.

Para testar no jogo: **Novo jogo** e jogue; o estado da história vai junto no save. Saves antigos
começam sem nenhum gatilho disparado (sem a abertura).

## O que já está no roteiro

A primeira hora do jogo, como esqueleto para a narrativa definitiva:

| Gatilho | Quando | O que acontece |
|---|---|---|
| `t_inicio` | Novo jogo | Abertura com o protagonista e os amigos; objetivo da horta. |
| `t_horta` | Horta posta na planta | Reação; entram os objetivos do contrato e da pesquisa. |
| `t_radio_bando` | Dia 2 | Rádio avisa de um bando; objetivo de cercar a vila. |
| `t_primeiro_contrato` / `t_primeira_derrota` | Primeiro contrato | Reação à vitória ou à derrota. |
| `t_primeiro_ataque` | Primeiro ataque | Alarme antes da defesa; objetivo do cerco. |
| `t_ataque_vencido` / `t_ataque_perdido` | Fim do ataque | Vitória traz 3 famílias; derrota, luto. |
| `t_primeira_morte` | Primeira morte | Memorial. |
| `t_primeira_pesquisa` | Primeira pesquisa | Engenharia. |
| `t_estagio1` | Estágio Comunidade Fortificada | O governo começa a prestar atenção. |
| `t_iracema` | Dia 5 com 1 contrato cumprido | Iracema pede ajuda: escolha cria o contrato da história. |
| `t_tome_resgatado` / `t_tome_perdido` | Contrato `irmao_luz` | Tomé “Farol” entra no grupo, ou some. |
| `t_cubo_pesquisa` | Pesquisa `cubo` | Primeira pista sobre o Cubo. |

Cadeia de objetivos: horta → (primeiro contrato → mais uma casa → Comunidade Fortificada) e
pesquisa; o cerco entra no dia 2 ou no primeiro ataque.
