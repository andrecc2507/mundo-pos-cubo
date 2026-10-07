# Dons — proposta inicial (para revisão)

> **Status:** rascunho para o diretor revisar. Nada implementado.
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

## Perguntas para o diretor

1. Os 12 servem como ponto de partida? Quais cortar, trocar ou acrescentar?
2. O protagonista escolhe entre estes 12 no início, ou entre um subconjunto?
3. Algum Dom deve ser exclusivo do protagonista ou da história?
