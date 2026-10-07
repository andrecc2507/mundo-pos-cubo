# Arquitetura

## Camadas

```
main.ts ──► game/ ──► core/
              │
ui/ ──────────┘ (apenas via Services/EventBus)
```

- **core/** é um motor genérico. Nunca importa de `game/` nem de `ui/`.
  Se algo do core precisa conhecer tipos do jogo, usa *declaration merging*
  (veja "Pontos de extensão").
- **game/** contém regras, conteúdo e cenas. Importa o core via `@core`.
- **ui/** é DOM sobre o canvas. Lê estado por eventos; age emitindo eventos.

## Módulos do jogo

A lógica de regras é **pura** (sem DOM, testável no Node) e fica separada das cenas:

| pasta | responsabilidade |
|-------|------------------|
| `game/rules` | `stats` (matemática central: atributos, derivados, acerto, dano, linha do tempo — números em `data/balance.json`), `balance_sim` (simulação de balanceamento), personagem, atributos derivados, curva de custo, XP, recrutamento, `gifts` (Dons: árvores, técnicas, P/C/V), `mastery` (Maestria por uso), `perks`, `duo` (técnicas de dupla), `skill_tree` (teia das classes e árvores auxiliares) |
| `game/battle` | `map` (tiles), `stack` (prédios: peças empilhadas, andares, portas/janelas/escadas, física de desabamento; ver `docs/design/predios.md`), `los` (visão 3D), `elements` (superfícies, nuvens, status, clima), `engine` (barra de ação, movimento, ações, combos, vitória), `creature_fx` (efeitos das criaturas: passivas, reações, agarrões, invocações, posturas, mecânicas únicas, reação única por batalha), `cover` (cobertura estilo XCOM), `props` (coberturas destrutíveis), `notices` (avisos de ambiente e estado), `ai` |
| `game/bestiary` | edições locais do bestiário (`bestiary_store`) e resumo mecânico das habilidades (`describe`) |
| `game/mapgen` | ruínas pós-apocalípticas por região (`ruins`, padrão das batalhas), geração por bioma e mapas salvos do editor |
| `game/geo` | globo: jogo novo (`create`), estado e relógio (`game`), vila (`village`), contratos, ataques e encontros (`events`), política, pessoas e recrutamento (`people`), legado dos mortos (`legacy`), esquadrões e avião (`squads`), simulação longa (`sim`) |
| `game/demo` | esquadrão da demo, vilões, figurantes e feras alteradas (`demo_squad`) |
| `game/render` | câmera isométrica com 4 rotações, sprites em pixel art gerados por código ou arte pronta com animações por pose (`sprite_anims`, ver `docs/design/sprites.md`), `anim_style` (qual animação cada ação usa) e `battle_fx` (golpes, projéteis, partículas, clarões) |
| `game/scenes` | orquestram lógica + render + UI em DOM (`src/ui/dom.ts`; menus flutuantes em `src/ui/menu.ts`) |
| `game/state` | `store`: resultado de batalha e mapa do editor; `geo_store`: jogo do globo, espaços de save e salvamento automático; `settings`: opções do jogador (velocidade, texto, teclas, acessibilidade, idioma) |
| `game/i18n` | `t('texto em português')` → texto no idioma das opções (dicionários `<idioma>.json`, chave = texto em português) |
| `game/input` | `gamepad`: controle via Gamepad API (botões → ações; analógico move um cursor que clica) |

Fluxo globo ↔ batalha: o globo monta um `BattleSetup` (`geo/contracts.ts`, `geo/events.ts`) e abre a
cena `battle`; ao terminar, a batalha grava `store.battleResult` e volta; o globo aplica o resultado
(XP, Maestria, mortes permanentes, ferimentos, dinheiro, contrato, legado). `npm run sim` roda batalhas
IA × IA em massa e grava `docs/design/simulacao.md`.

## Fluxo de um frame

```
GameLoop.advance(elapsed)
 ├─ SceneManager.applyPending()        troca de cena só acontece aqui
 ├─ N × tick fixo (1/60s)
 │   ├─ Scene.update(dt)
 │   │   ├─ SystemRegistry.update       fases: input → logic → physics → late
 │   │   ├─ Scene.onUpdate
 │   │   └─ World.flush()               aplica destruições pendentes
 │   └─ Input.endTick()                 limpa justPressed/justReleased
 └─ Scene.render(alpha)                 sistemas desenham, depois a cena
```

A simulação roda em passo fixo e usa `ctx.rng` (determinístico): mesma seed +
mesmo input = mesmo resultado. Isso habilita replays e testes confiáveis.

## ECS

- **Entidade**: um número (`world.spawn()`).
- **Componente**: dado puro, sem métodos (`defineComponent<{ hp: number }>('Health')`).
- **Sistema**: lógica que consulta componentes (`world.query(Health, Transform)`).

Sistemas não guardam referências a outros sistemas nem a entidades de outras
cenas. Comunicação entre sistemas acontece por:
1. **Componentes** (um escreve, outro lê) — preferido para dados por entidade.
2. **Eventos** (`ctx.events.emit`) — para acontecimentos pontuais.
3. `ctx.systems.get<T>('id')` — só para consultas de leitura a um sistema declarado em `dependsOn`.

## Sistemas

Cada sistema é um objeto `System` criado por uma fábrica e registrado em
`game/systems/catalog.ts`. Ele declara:

| campo                   | uso                                                                 |
|-------------------------|---------------------------------------------------------------------|
| `id`                    | igual à chave no catálogo                                           |
| `phase`                 | `input`, `logic` (padrão), `physics` ou `late`                      |
| `dependsOn`             | sistemas que precisam existir e rodar antes; entram automaticamente |
| `init` / `dispose`      | ciclo de vida junto com a cena                                      |
| `update(dt)`            | tick fixo                                                           |
| `render(alpha)`         | desenho por frame                                                   |
| `serialize/deserialize` | estado persistente, usado pelo save                                 |

O `SystemRegistry` valida dependências ausentes, ciclos e dependências que
apontam para fases posteriores — erros aparecem ao entrar na cena (e nos testes),
não no meio do jogo.

## Cenas

Uma cena é um modo de jogo (menu, mapa, combate…). Cada uma tem **seu próprio
World e seus próprios sistemas**, listados em `systems`. Trocar de cena descarta
o World anterior; estado que precisa sobreviver vai para um sistema
serializável ou para o save.

Ganchos: `onEnter(params)` (antes dos sistemas iniciarem — crie entidades aqui),
`onReady()`, `onUpdate`, `onRender`, `onExit`.

## Pontos de extensão (declaration merging)

O core expõe interfaces vazias que o jogo completa, mantendo tipagem forte sem
acoplamento:

| interface     | módulo                       | para quê                  |
|---------------|------------------------------|---------------------------|
| `EventMap`    | `@core/events/event_map`     | eventos e seus payloads   |
| `DataCatalog` | `@core/data/data_registry`   | domínios de dados em JSON |
| `SceneParams` | `@core/scenes/scene_manager` | ids de cena e parâmetros  |

## Dados

Conteúdo (unidades, itens, habilidades…) fica em `game/data/<dominio>/*.json`,
com o tipo em `game/data/types.ts`. Tudo é registrado no boot no
`DataRegistry` e acessado por `ctx.data.get('dominio', 'id')`. Prefabs
transformam definições em entidades.

## Save

`SaveService` grava `{ version, savedAt, data }`. Ao mudar o formato, incremente
`GAME_CONFIG.save.version` e adicione `migrations[versaoAntiga]`. O gameplay
salva `registry.serialize()` — ou seja, cada sistema cuida do próprio estado.
