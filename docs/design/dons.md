# Dons — catálogo central

> **Status:** implementado (2026-10-07). O catálogo do diretor (335 Dons em 14 categorias) é a
> fonte: `tools/gift_catalog.py` (linhas do catálogo) + `tools/gift_catalog_new.py` (mecânica dos
> Dons novos) → `python3 tools/gen_catalog.py` gera `data/gifts/gifts.json` e `signatures.json`.
> O texto abaixo da linha é a proposta inicial (12 Dons), mantida como histórico.

## Conceito

O Dom não determina a classe: um Pirocinético pode ser Impacto, Movimento, Suporte ou Controle — a
classe é **como** ele usa o Dom (as 4 filosofias da árvore do Dom).

## Categorias (14) e números

I Físicos (1–35) · II Energia (36–70) · III Elementais (71–100) · IV Psíquicos (101–130) ·
V Matéria (131–160) · VI Transformação (161–190) · VII Espaço (191–205) · VIII Tempo (206–215) ·
IX Sentidos (216–235) · X Criação (236–255) · XI Controle (256–280) · XII Mobilidade (281–295) ·
XIII Suporte (296–315) · XIV Anômalos (316–335). A categoria escolhe a forma da árvore (família
interna: físico, emissor, manipulador, criador, sensorial ou anômalo).

## Raridade (6) — raridade ≠ poder

| Raridade | Dons no catálogo | Fatia da população com Dom |
|---|---|---|
| Comum | 69 | 55% |
| Incomum | 111 | 28% |
| Raro | 85 | 12% |
| Épico | 37 | 4% |
| Lendário | 12 | 0,8% |
| Anômalo | 21 (a categoria XIV inteira e o Loop Temporal) | 0,2% — praticamente únicos: nunca sai um que já esteja em jogo |

O sorteio escolhe primeiro a raridade pela fatia e depois um Dom dela (`gift_rules.json` → `rarityShare`).

## Potência, Controle e Versatilidade

Cada Dom tem valores de base (1–10) no catálogo; **cada portador** sorteia em volta (±2), então dois
pirocinéticos lutam diferente (o brutamontes P10/C3/V2 × o técnico P6/C10/V9). Em batalha
(`rules/stats.ts`, números em `balance.json` → `giftStats`):

- **Potência:** dano das técnicas do Dom (5 = ×1; cada ponto ±4%).
- **Controle:** acerto das técnicas do Dom (±2 por ponto) e Strain gerado (∓4% por ponto).
- **Versatilidade:** técnicas do Dom no loadout — 8+ dá uma a mais, 10 dá duas.

## Estágios e Despertar

Cada Dom tem **Estágio I — Manifestação**, **II — Especialização** e **III** (o texto do
catálogo), que são as técnicas de nível 1, 3 e 6 da árvore, mais a **Assinatura** (NV 4). O
**Despertar** mostra o texto do catálogo (a propriedade que não era evidente) e usa a mecânica de
despertar do motor (potencial ★4+, Strain alto, momento dramático). A **Limitação** do catálogo é a
fraqueza do Dom.

## Origem dos 335

171 Dons do catálogo reaproveitam um Dom que já existia (mecânica, inata e assinatura, com o nome e
o número novos); 164 são novos, cada um com passiva inata e técnica-assinatura próprias. Oito Dons
antigos sem lugar no catálogo saíram (Atração, Rotação, Ossos Projéteis, Sangue Ácido, Teia, Pontes,
Visão Distante, Vento).

---

# Dons — proposta inicial (para revisão)

> **Status:** aprovado como ponto de partida (2026-10-07). Nada implementado.
> Regras gerais em [pos_cubo.md](pos_cubo.md); especificação original em
> [fontes/sistema_recrutamento_dons.md](fontes/sistema_recrutamento_dons.md).

## Como um Dom é descrito

Todo Dom é **dado** (`GiftData`, o que o Dom é) e cada personagem tem uma **instância**
(`GiftInstance`, como aquela pessoa o possui: Maestria, Strain, nós da árvore, Despertar).

| Campo | O que é |
|---|---|
| Família | Físico, Emissor, Manipulador, Criador, Sensorial, Anômalo |
| Raridade | Comum, Incomum, Raro, Excepcional, Lendário (raridade ≠ poder) |
| Propriedades | 3–6 palavras-chave que viram **tags** de combo (ex.: Área, Condutor, Impulso) |
| Fraqueza | Pelo menos uma limitação real e uma condição de uso |
| Strain | Quanto cada uso pesa; o que alivia |
| Overload | O que acontece em 100 (sempre próprio do Dom) |
| Usos por classe | Como Impacto, Movimento, Suporte e Controle usam o mesmo Dom — o coração do sistema |
| Despertar | A **regra** que muda (nunca só "+dano") |

Cada Dom tem uma árvore própria (aba **Dom** na tela de evolução) com técnicas para as quatro
filosofias; a classe do personagem deixa as técnicas da sua filosofia mais baratas (afinidade).

## Os 12 primeiros (2 por família)

### Físicos

**1. Densidade** — Comum
- Propriedades: Peso, Resistência, Impacto.
- Fraqueza: denso, anda menos; não nada; cai mais fundo (dano de queda maior).
- Overload: corpo trava — imobilizado 1 turno.
- Impacto: soco pesado que empurra 2 casas e atravessa cobertura leve.
- Movimento: queda controlada — pula de telhados sem dano e derruba quem está embaixo.
- Suporte: vira escudo — intercepta golpes de um aliado ao lado.
- Controle: firma o pé — não pode ser empurrado e bloqueia passagem.
- Despertar: **densidade compartilhada** — torna um aliado tocado inabalável também.

**2. Regeneração** — Incomum
- Propriedades: Cura, Persistência, Corpo.
- Fraqueza: cura gasta comida/energia (Stamina máxima cai até descansar); não regenera membros
  perdidos em Overload.
- Overload: desmaio por fome — caído 1 turno (sem sangrar).
- Impacto: luta no limite — golpes ficam mais fortes quanto menos vida tiver.
- Movimento: atravessa fogo e veneno sem parar.
- Suporte: **transfusão** — passa parte da própria vida para um aliado ao lado.
- Controle: segura o inimigo no corpo a corpo, aguentando o castigo (agarrar).
- Despertar: a cura também **limpa estados** de quem ela toca.

### Emissores

**3. Eletricidade** — Comum
- Propriedades: Área, Condutor, Atordoamento.
- Fraqueza: alcance curto; água e metal espalham também nos aliados; chuva aumenta o Strain.
- Overload: curto-circuito — atordoa a si mesmo e quem estiver colado.
- Impacto: descarga em cadeia entre inimigos molhados ou em metal.
- Movimento: **corrida elétrica** — anda 3 casas extra numa linha reta.
- Suporte: religa máquinas, portas e geradores; ressuscita equipamento eletrônico.
- Controle: campo que atordoa quem pisar.
- Despertar: a eletricidade **salta entre aliados** sem ferí-los, levando a descarga mais longe.

**4. Calor** — Incomum
- Propriedades: Fogo, Área, Luz.
- Fraqueza: aquece o próprio corpo — cada uso seguido aumenta mais o Strain; ineficaz na água.
- Overload: queima a si mesmo e acende o chão em volta.
- Impacto: rajada que incendeia o terreno.
- Movimento: propulsão — salta longe, deixando um rastro de fogo.
- Suporte: aquece aliados (anula congelado/frio) e ilumina a noite.
- Controle: muro de calor que bloqueia passagem por 2 rodadas.
- Despertar: **chama controlada** — o fogo deixa de atingir aliados.

### Manipuladores

**5. Vetor** — Raro
- Propriedades: Direção, Precisão, Impulso, Alcance.
- Fraqueza: precisa de alvo à vista; o custo cresce com o peso (alvos grandes custam o dobro).
- Overload: tontura — erra o próximo uso para uma direção aleatória.
- Impacto: arremessa o alvo contra paredes e outros inimigos.
- Movimento: muda a própria trajetória — salta e muda de direção no ar.
- Suporte: puxa um aliado em perigo para perto de si.
- Controle: puxa ou empurra o inimigo para onde quiser (armadilhas, bordas).
- Despertar: **redirecionar projéteis** — reação que devolve um tiro.

**6. Gravidade** — Raro
- Propriedades: Peso, Área, Controle, Queda.
- Fraqueza: afeta também aliados dentro da área; custo alto em área grande.
- Overload: a própria gravidade dobra — não anda no próximo turno.
- Impacto: esmaga numa área 3×3 (dano maior em quem está no alto).
- Movimento: flutua — ignora altura e buracos por 1 turno.
- Suporte: alivia o peso de um aliado ferido (anda mais, carrega o caído sem penalidade).
- Controle: prende inimigos no chão (imobilizado).
- Despertar: **inverter a gravidade** de uma área (o molde já tem gravidade invertida).

### Criadores

**7. Barreira** — Comum
- Propriedades: Escudo, Construção, Cobertura.
- Fraqueza: barreira tem vida própria e quebra; não ataca diretamente.
- Overload: todas as barreiras ativas se desfazem de uma vez.
- Impacto: barreira empurrada como aríete.
- Movimento: plataforma — cria degraus para subir em telhados.
- Suporte: escudo em um aliado (barreira de vida).
- Controle: paredes que cortam a linha de tiro e prendem inimigos.
- Despertar: barreiras **refletem** parte do dano.

**8. Forja** — Incomum
- Propriedades: Armas, Ferramentas, Metal.
- Fraqueza: precisa de matéria-prima (metal no mapa ou levado); objetos duram a batalha.
- Overload: mãos travadas — não usa armas por 1 turno.
- Impacto: cria uma arma pesada temporária.
- Movimento: gancho e corda — sobe e atravessa vãos.
- Suporte: conserta armas e equipamentos no meio da luta (recarrega munição de um aliado).
- Controle: cria armadilhas e grades.
- Despertar: o que forja **fica** depois da batalha (vira item de verdade).

### Sensoriais

**9. Eco** — Incomum
- Propriedades: Som, Detecção, Atordoamento.
- Fraqueza: em silêncio é forte; barulho alto (explosões, tiros perto) cega o Dom por 1 turno.
- Overload: zumbido — confuso 1 turno.
- Impacto: grito que atordoa em cone.
- Movimento: mapeia o caminho — anda sem tropeçar no escuro e acha passagens.
- Suporte: revela inimigos escondidos para todo o squad.
- Controle: ruído que confunde inimigos numa área.
- Despertar: **eco do futuro** — vê o próximo movimento de um inimigo (prevê a ação dele).

**10. Rastro** — Comum
- Propriedades: Percepção, Marca, Precisão.
- Fraqueza: quase nada contra quem nunca viu; marca some se perder de vista por 2 turnos.
- Overload: sobrecarga sensorial — −precisão por 2 turnos.
- Impacto: golpe certeiro em alvo marcado (acerto garantido).
- Movimento: segue o alvo marcado — anda grátis atrás dele.
- Suporte: a marca dá bônus de acerto a todo o squad.
- Controle: o marcado não consegue se esconder.
- Despertar: marca **vários alvos** ao mesmo tempo.

### Anômalos (raros por definição)

**11. Troca** — Excepcional
- Propriedades: Posição, Teleporte, Truque.
- Fraqueza: só troca de lugar com algo/alguém à vista; precisa de algo do outro lado.
- Overload: desorientado — perde o próximo turno.
- Impacto: troca de lugar com o inimigo e o deixa na frente do tiro dos aliados.
- Movimento: troca com um objeto distante (atravessa o mapa).
- Suporte: tira um aliado do perigo trocando com ele.
- Controle: troca dois inimigos de lugar (um para dentro da armadilha).
- Despertar: **troca de estados** — passa um debuff seu para o inimigo trocado.

**12. Pausa** — Lendário
- Propriedades: Tempo, Congelar, Ritmo.
- Fraqueza: muito caro; não age sobre si mesmo; cada uso atrasa a própria barra de ação.
- Overload: envelhece — perde vida máxima até o fim da batalha.
- Impacto: congela o alvo no tempo e acumula os golpes recebidos para depois (todos de uma vez).
- Movimento: anda enquanto o mundo para (ação extra curta).
- Suporte: adianta a barra de ação de um aliado.
- Controle: atrasa a barra de ação de um inimigo.
- Despertar: **bolha de pausa** em área por 1 rodada.

## Decidido

- Os 12 ficam como ponto de partida.
- O protagonista escolhe entre os 10 não anômalos (ver [classes_armas.md](classes_armas.md)).
- Nenhum Dom é exclusivo.
