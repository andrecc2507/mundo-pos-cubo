# Mundo Pós-Cubo

Jogo em **TypeScript** rodando no navegador, sem engine: núcleo próprio com ECS,
sistemas plugáveis, cenas, input por ações, save versionado e conteúdo em JSON.

## Começando

```bash
npm install
npm run dev          # servidor local com hot reload
npm test             # testes (Vitest)
npm run typecheck    # checagem de tipos
npm run build        # build de produção em dist/
```

## Como jogar

- **Menu:** Continuar · Novo jogo · Carregar · Demo de batalha · Banco de personagens · Opções; atalhos
  para Bestiário, Arsenal e Editor de mapas.
- **Novo jogo:** protagonista com Dom, 5 amigos e **10 recrutas escolhidos numa lista** (pessoas do
  Banco de personagens podem aparecer nela). Roupas prontas com as cores escolhidas. Depois, o lugar
  da vila no globo. Opções da campanha: dificuldade, **Sorte justa** e **Ironman**.
- **Hub (estilo XCOM/Xenonauts):** barra de comandos embaixo (Globo, Vila, Esquadrão, Recrutar,
  Intendência, Pesquisa, Engenharia, Governos, Memorial, Registro), recursos em cima, quadro de
  **Objetivos** e avisos. O tempo corre com pausa (espaço, 1–3) e para nos acontecimentos.
- **Globo:** contratos, encontros na estrada, política entre governos e o avião da equipe.
- **Vila (tecla V ou clique na vila):** a planta da vila, estilo Age of Empires. Casas, hortas,
  instalações, paliçadas e muros traçados arrastando, portões, torres e armadilhas. As obras andam com
  o relógio e as equipes da vila. O ataque à vila é lutado no mapa da própria vila.
- **Pesquisa e Engenharia:** projetos liberam itens, construções e melhorias; a oficina fabrica armas,
  armaduras e itens de suporte.
- **História:** diálogos com retrato, escolhas, objetivos e contratos da história, escritos em JSON
  ([manual](docs/design/gatilhos.md)).
- **Batalha:** linha do tempo de velocidade (cada um age quando a barra enche). Mover + agir; Dons com
  Strain e Overload; figurantes caem com 1–2 golpes. **Névoa de guerra para os dois lados:** a IA só
  ataca quem o time dela vê e procura pelo barulho. **Q/E** giram a câmera, roda = zoom, **Esc** cancela.
- **Depois da missão:** relatório com destaque, patentes e apelidos, memorial de quem caiu.
- **Dev mode:** botão **DEV** (ou **F2**/**`**) abre ações de teste da tela atual.
- **Áudio:** trilhas e efeitos sintetizados ao vivo (Web Audio, sem arquivos). Botão 🔊 para volume; **M** silencia.
- **Bestiário:** ficha editável de cada animal alterado pelo Cubo, com prévia em combate.
- **Editor de mapas:** pinta terreno, altura, objetos, superfícies e spawns; gera por bioma ou ruínas
  por região; salva no navegador, exporta/importa JSON e testa a batalha no mapa.

## Estrutura

```
src/
  main.ts              ponto de entrada (monta jogo + UI)
  core/                motor genérico — não conhece nada do jogo
    ecs/               World, entidades, componentes, queries
    events/            EventBus tipado + catálogo de eventos (EventMap)
    systems/           interface System + SystemRegistry (dependências e fases)
    scenes/            Scene (World + sistemas próprios) e SceneManager
    loop/              GameLoop com passo fixo
    input/             Input baseado em ações (rebind por configuração)
    render/            Renderer Canvas 2D com resolução lógica
    assets/            carregamento e cache de imagens/áudio/json
    save/              SaveService com versão e migrações
    data/              DataRegistry (conteúdo por domínio/id)
    utils/             logger, RNG determinístico, matemática
  game/                o jogo em si
    config/            constantes e mapa de teclas
    data/              conteúdo em JSON (classes, Dons, árvores, itens, bestiário, globo, roteiro)
    rules/             personagem, matemática central, Dons, maestria, recrutamento (lógica pura)
    battle/            motor tático: mapa, elementos, visão, turnos por barra de ação, IA
    mapgen/            ruínas por região, mapas por bioma, mapa da vila e mapas salvos do editor
    geo/               globo: vila e planta, contratos, ataques, encontros, política, pessoas,
                       pesquisa/engenharia e história (gatilhos)
    render/            isométrico com rotação, pixel art em código
    scenes/            boot, main_menu, geo_creation, geoscape, battle, demo, arsenal, bestiary, map_editor
    audio/             música ambiente e efeitos sonoros procedurais
    dev/               dev mode e esquadrão de teste
    state/             estado que atravessa cenas + save
    systems/           sistemas ECS por frame (catalog.ts)
  ui/                  camada DOM sobre o canvas (HUD, menus complexos)
public/assets/         sprites, áudio, fontes
tests/                 testes do core e do jogo
tools/                 geradores (ex.: new-system)
docs/                  arquitetura, convenções, design do jogo
```

## Documentação

- [Arquitetura](docs/ARCHITECTURE.md) — como as peças se encaixam
- [Adicionando sistemas e conteúdo](docs/ADDING_FEATURES.md) — passo a passo
- [Convenções](docs/CONVENTIONS.md) — nomes, pastas, regras
- [Game Design](docs/GDD.md) — o jogo em si
- [Design consolidado](docs/design/pos_cubo.md) — decisões do Mundo Pós-Cubo
- [Globo, vila e contratos](docs/design/mapa_mundi.md) — o jogo base
- [História e gatilhos](docs/design/gatilhos.md) — manual de quem escreve o roteiro
- [Pesquisa de mercado](docs/design/pesquisa_mercado.md) — o que os jogadores de táticos pedem
