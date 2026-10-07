# SISTEMA DE RECRUTAMENTO, DONS E PROGRESSÃO DE TROPAS
## Especificação de implementação — Tactical RPG de super-humanos
### Documento destinado ao Codex / programação do projeto

---

## 0. OBJETIVO DO DOCUMENTO

Implementar, sobre a arquitetura já existente do jogo, um sistema completo de:

- recrutamento procedural de tropas;
- Dons individuais;
- potencial de crescimento;
- atributos e progressão;
- integração dos Dons com a teia de classes;
- subclasses;
- especializações híbridas;
- domínio de técnicas;
- sobrecarga do Dom;
- despertar;
- traços de personalidade;
- ferimentos e estados persistentes;
- morte permanente;
- legado de veteranos mortos;
- substituição de tropas;
- geração de novos recrutas;
- persistência dos dados;
- interface para inspeção e gerenciamento.

IMPORTANTE:

Este documento NÃO substitui nem reescreve os sistemas-base já existentes.

O objetivo é adicionar o sistema como uma camada modular sobre a arquitetura atual.

Antes de alterar qualquer sistema existente:

1. localizar as classes, recursos, componentes e managers já responsáveis por unidades;
2. identificar como XP, nível, atributos, skills, combate, save/load e equipamentos são armazenados;
3. reutilizar essas estruturas sempre que possível;
4. criar novos módulos apenas onde a arquitetura atual não possuir equivalente;
5. não duplicar sistemas existentes;
6. não alterar fórmulas já balanceadas sem necessidade;
7. preservar compatibilidade com saves sempre que possível.

Se houver conflito entre este documento e uma implementação já consolidada do projeto, preservar a arquitetura existente e adaptar esta especificação.

---

# 1. VISÃO GERAL

O jogo utiliza uma estrutura de progressão baseada em uma TEIA.

A estrutura principal é:

- 4 classes fundamentais;
- cada classe possui 4 subclasses;
- subclasses vizinhas podem formar especializações híbridas;
- a progressão ocorre em uma teia com os eixos Norte, Leste, Sul e Oeste;
- combinações diagonais representam fusões entre filosofias de combate.

A nova camada introduz o conceito de DOM.

A regra fundamental é:

> CLASSE define COMO o personagem luta.
>
> DOM define O QUE o personagem consegue fazer.
>
> SUBCLASSE define sua especialização.
>
> FUSÃO define uma nova lógica de gameplay resultante da combinação.
>
> TALENTOS/TRACOS definem características individuais.
>
> MASTERIA define quanto o personagem domina suas técnicas.
>
> DESPERTAR representa o ápice de desenvolvimento de determinados Dons.

O Dom NÃO deve determinar automaticamente uma classe.

O mesmo Dom deve poder ser utilizado de maneiras radicalmente diferentes dependendo da classe e da especialização escolhida.

---

# 2. PRINCÍPIOS DE DESIGN

## 2.1. Não criar "classes de poderes"

Não fazer:

- Dom de fogo = Artilheiro;
- Dom de força = Demolidor;
- Dom de cura = Médico.

Isso reduziria o sistema a uma relação 1:1.

Em vez disso:

DOM = conjunto de capacidades e restrições.

CLASSE = método de aplicação dessas capacidades.

Exemplo:

Dom: GRAVIDADE.

Pode ser usado como:

- Impacto: aumentar gravidade sobre inimigos para causar dano;
- Movimento: reduzir a própria gravidade para saltar;
- Controle: prender inimigos;
- Suporte: reduzir gravidade de um aliado ferido.

---

## 2.2. Todo Dom deve possuir uma fraqueza

Nenhum Dom deve ser simplesmente "melhor".

Cada Dom deve ter pelo menos:

- uma vantagem;
- uma limitação;
- uma condição de uso;
- uma possibilidade de especialização.

Exemplo:

DOM: ELETRICIDADE

Vantagens:
- dano em área;
- interação com condutores;
- possibilidade de atordoamento.

Limitações:
- sobrecarga;
- dependência de alcance;
- determinados terrenos podem alterar o comportamento.

---

## 2.3. Raridade não é sinônimo de poder

Um Dom raro deve ser interessante, não necessariamente superior.

Um Dom comum bem especializado pode superar um Dom raro mal utilizado.

---

# 3. ESTRUTURA DE DADOS DO RECRUTA

Cada recruta deve ser uma entidade persistente.

Estrutura conceitual:

```text
Recruit
├── id
├── name
├── age
├── level
├── xp
├── attributes
├── class
├── subclass
├── hybrid_specialization
├── quirk
├── quirk_potential
├── quirk_mastery
├── quirk_strain
├── traits
├── skills
├── skill_mastery
├── equipment
├── injuries
├── status_effects
├── relationships
├── reputation
├── missions
├── kills
├── assists
├── rescues
├── deaths
├── legacy_id
├── recruitment_origin
├── hidden_potential
├── awakening_state
└── alive
```

Não utilizar literalmente os nomes acima se o projeto já possuir uma nomenclatura consolidada. Adaptar aos padrões existentes.

---

# 4. ATRIBUTOS

Utilizar os atributos já existentes no projeto.

Não criar um segundo sistema de atributos.

Se a implementação atual já utiliza:

- Força;
- Destreza;
- Velocidade;
- Inteligência;
- Constituição;

preservar esses atributos.

O Dom deve modificar ou utilizar esses atributos através de coeficientes próprios, e não criar atributos paralelos sem necessidade.

Exemplo:

```text
Dano físico:
Base + STR × coeficiente

Dano técnico:
Base + DEX/INT × coeficiente

Resistência:
CON × coeficiente

Frequência de ação:
sistema de Velocidade já existente
```

A implementação do Dom deve consultar os atributos existentes.

---

# 5. SISTEMA DE DONS

## 5.1. Conceito

Um Dom é um recurso permanente de um personagem.

O Dom possui:

```text
id
name
category
rarity
base_power
control
range
area
strain_cost
stamina_cost
tags
limitations
mastery_curve
evolution_options
awakening_data
compatible_classes
incompatible_classes
```

---

# 6. FAMÍLIAS DE DONS

Os Dons devem ser classificados em famílias para geração e balanceamento.

## 6.1. Físicos

Alteram o próprio corpo.

Exemplos conceituais:

- aumento de força;
- endurecimento;
- elasticidade;
- regeneração;
- alteração corporal;
- velocidade.

## 6.2. Emissores

Produzem ou projetam efeitos.

Exemplos:

- energia;
- calor;
- eletricidade;
- ondas;
- pressão;
- luz.

## 6.3. Manipuladores

Alteram propriedades, movimento ou forças.

Exemplos:

- vetor;
- gravidade;
- impulso;
- atrito;
- magnetismo.

## 6.4. Criadores

Produzem estruturas, objetos ou recursos.

Exemplos:

- armas;
- barreiras;
- plataformas;
- ferramentas;
- construções temporárias.

## 6.5. Sensoriais

Atuam sobre informação e percepção.

Exemplos:

- rastreamento;
- percepção de movimento;
- detecção;
- visão especial;
- leitura de sinais.

## 6.6. Anômalos

Dons que não se encaixam adequadamente nas categorias anteriores ou que alteram regras fundamentais do combate.

Esses devem ser raros.

---

# 7. PROPRIEDADES DO DOM

Todo Dom deve possuir de 3 a 6 propriedades.

Exemplo:

```text
DOM: VETOR

Propriedades:
- Manipulação
- Precisão
- Direção
- Alcance

Limitações:
- requer alvo válido;
- não afeta objetos acima de determinado peso;
- custo cresce com massa manipulada.
```

Outro:

```text
DOM: ELETRICIDADE

Propriedades:
- Área
- Condutor
- Atordoamento

Limitações:
- sobrecarga;
- alcance;
- terreno pode modificar propagação.
```

---

# 8. RARIDADE DOS DONS

Distribuição inicial recomendada:

```text
Comum       60%
Incomum     25%
Raro        10%
Excepcional 4%
Anômalo     1%
```

Esses valores devem ser configuráveis.

Não hardcodar.

Criar uma tabela de configuração:

```text
recruit_quirk_rarity_weights
```

---

# 9. POTENCIAL

Cada recruta possui Potencial de Dom.

Valores:

```text
1 estrela
2 estrelas
3 estrelas
4 estrelas
5 estrelas
```

Potencial determina principalmente:

- teto de Mastery;
- quantidade máxima de evoluções;
- chance de despertar;
- quantidade de slots de técnica específicos do Dom;
- velocidade de domínio.

Potencial NÃO deve fornecer diretamente dano bruto.

---

# 10. POTENCIAL OCULTO

Opcionalmente, determinados recrutas podem possuir potencial parcialmente oculto.

Exemplo:

```text
Potencial aparente: ★★★☆☆
Potencial real: ★★★★★
```

O potencial real pode ser descoberto através de:

- treinamento;
- laboratório;
- missões;
- mentor;
- equipamento de análise.

Isso cria uma camada de descoberta.

---

# 11. RECRUTAMENTO

O jogo deve possuir um Recruitment Manager.

Responsabilidades:

- gerar candidatos;
- aplicar pesos de origem;
- gerar Dom;
- gerar potencial;
- gerar atributos;
- gerar traços;
- gerar afinidades;
- registrar candidatos disponíveis;
- remover candidatos contratados;
- atualizar pool periodicamente.

---

# 12. GERAÇÃO DE RECRUTA

Fluxo:

```text
Generate Candidate
        ↓
Generate Base Attributes
        ↓
Generate Quirk
        ↓
Generate Quirk Potential
        ↓
Generate Traits
        ↓
Generate Hidden Potential
        ↓
Generate Class Affinities
        ↓
Generate Background
        ↓
Add to Recruitment Pool
```

O recrutamento deve ser determinístico mediante seed quando possível.

Isso facilita debugging e reprodução de bugs.

---

# 13. ORIGEM DOS RECRUTAS

Cada recruta pode possuir uma origem.

Exemplos:

- academia;
- voluntário civil;
- organização parceira;
- sobrevivente de incidente;
- veterano;
- especialista técnico;
- programa de emergência;
- recrutamento regional.

A origem modifica pesos.

Exemplo:

```text
Academia:
+DEX
+INT
+Mastery inicial

Veterano:
+atributos
+traços
+experiência

Civil:
maior variedade
menor treinamento inicial

Especialista:
maior chance de suporte/engenharia
```

---

# 14. CLASSE E DOM

No recrutamento, o personagem não precisa receber imediatamente uma subclasse definitiva.

Pode possuir:

```text
Afinidade Impacto: 72
Afinidade Movimento: 48
Afinidade Suporte: 31
Afinidade Controle: 65
```

Isso indica facilidade de treinamento.

O jogador escolhe a direção.

---

# 15. AFINIDADE

Afinidade é diferente de classe.

Ela representa:

> o quanto aquele personagem naturalmente se adapta a determinada filosofia de combate.

Exemplo:

```text
Impacto     80
Movimento   40
Suporte     25
Controle    75
```

Esse recruta é naturalmente adequado para:

- Demolidor;
- Duelista;
- Restritor;
- Executor;

mas ainda pode ser treinado em Movimento ou Suporte.

Não bloquear o jogador artificialmente.

Afinidade deve alterar:

- custo de desbloqueio;
- XP de Mastery;
- eficiência inicial;
- requisitos.

---

# 16. TEIA DE CLASSES

Preservar a teia já existente.

Modelo:

```text
                    NORTE
                     │
                     │
              ┌──────┼──────┐
              │      │      │
             NW      N      NE
              │      │      │
OESTE ────────┼──────●──────┼──────── LESTE
              │      │      │
             SW      S      SE
              │      │      │
              └──────┼──────┘
                     │
                   SUL
```

As quatro direções são as quatro classes principais já existentes.

Não substituir os nomes existentes do projeto.

---

# 17. SUBCLASSES

Cada classe possui quatro subclasses.

A implementação deve ler essas subclasses de dados configuráveis.

Não criar lógica específica hardcoded para cada nome.

Cada SubclassData deve conter:

```text
id
parent_class
description
role
stat_modifiers
skill_pool
passives
mastery_bonus
hybrid_options
```

---

# 18. FUSÕES

A fusão entre subclasses deve ser tratada como uma especialização, não como uma nova classe principal.

Exemplo conceitual:

```text
Demolidor + Corredor
        ↓
RAM
```

A fusão não deve simplesmente somar bônus.

Ela deve introduzir uma nova regra.

Exemplo:

```text
RAM:
dano = base_damage + movement_tiles × ram_multiplier
```

Outro exemplo:

```text
Restritor + Demolidor
        ↓
Executor de Contenção

O alvo imobilizado recebe dano adicional.
```

---

# 19. REQUISITOS DE FUSÃO

Uma fusão deve exigir:

- nível mínimo;
- investimento nas duas subclasses;
- número mínimo de habilidades dominadas;
- eventualmente uma missão de treinamento.

Exemplo:

```text
Requisito:
Subclass A >= 20%
Subclass B >= 20%
Level >= 15
Mastery >= 3 skills
```

Todos os valores devem ser configuráveis.

---

# 20. MASTERIA DE DOM

Cada Dom possui Mastery independente.

Faixa recomendada:

```text
0–100
```

Mastery não deve subir simplesmente com o nível.

Ela deve subir principalmente através do uso do Dom.

Exemplo:

```text
Usar habilidade:
+1 Mastery parcial

Uso eficiente:
+bonus

Uso em condição especial:
+bonus

Descobrir nova aplicação:
+bonus
```

---

# 21. MASTERIA POR TÉCNICA

Cada técnica também pode possuir Mastery.

Estrutura:

```text
Skill
├── level
├── mastery
├── uses
├── successful_uses
├── critical_uses
└── mastery_unlocks
```

Exemplo:

```text
Técnica: Impact Burst

Mastery 0:
efeito básico

Mastery 25:
-5% Strain

Mastery 50:
+10% precisão

Mastery 75:
novo comportamento

Mastery 100:
variante avançada
```

---

# 22. VARIANTES DE TÉCNICAS

Ao atingir determinado Mastery, o jogador pode escolher uma variante.

Exemplo:

```text
IMPACT BURST

          ┌── Poder
Base ─────┤
          ├── Controle
          └── Eficiência
```

Poder:

+30% dano
+25% Strain

Controle:

menor dano
maior precisão
aplica knockback

Eficiência:

menor dano
menor custo
menor Strain

A escolha deve ser permanente ou resetável apenas através de uma mecânica específica.

---

# 23. STRAIN — SOBRECARGA DO DOM

Adicionar um recurso específico para Dons.

```text
Quirk Strain: 0–100
```

Cada técnica possui:

```text
strain_cost
```

O Strain aumenta quando o Dom é usado.

Exemplo:

```text
0–49:
normal

50–74:
leve penalidade

75–89:
sobrecarga

90–99:
risco elevado

100:
OVERLOAD
```

---

# 24. OVERLOAD

Quando chega a 100, executar comportamento específico do Dom.

Nunca assumir que todo Dom tem o mesmo efeito.

Exemplos:

Dom físico:
- perda de força;
- exaustão.

Dom elétrico:
- stun;
- dano ao próprio usuário.

Dom sensorial:
- confusão;
- redução de precisão.

Dom de regeneração:
- consumo extremo de stamina.

O efeito deve ser definido em QuirkData.

---

# 25. RECUPERAÇÃO DE STRAIN

Strain pode diminuir por:

- passar turno;
- descansar;
- habilidade de recuperação;
- equipamento;
- determinadas condições de terreno;
- efeitos de suporte.

Não permitir recuperação instantânea sem custo, exceto quando explicitamente definido pelo Dom.

---

# 26. DESPERTAR

Nem todo personagem deve possuir despertar garantido.

Cada Dom possui:

```text
awakening_available
awakening_threshold
awakening_chance
awakening_requirement
awakening_effect
```

Exemplo:

```text
Mastery >= 90
Level >= 30
Missão específica concluída
```

Ao despertar:

```text
DOM
↓
AWAKENED DOM
```

O despertar deve alterar uma regra do Dom, não simplesmente:

> +50% dano.

Exemplos:

- área maior;
- novo alvo;
- nova interação com terreno;
- remover uma limitação;
- converter custo em outro recurso;
- criar reação;
- permitir combinação inédita.

---

# 27. TRAÇOS

Cada recruta possui 1–4 traços.

Tipos:

### Positivos
- disciplinado;
- resiliente;
- observador;
- protetor;
- técnico;
- adaptável.

### Neutros
- introvertido;
- competitivo;
- cauteloso;
- impulsivo.

### Negativos
- imprudente;
- inseguro;
- instável;
- teimoso.

Traços devem afetar gameplay de maneira mensurável.

---

# 28. TRAÇOS NÃO DEVEM SER APENAS TEXTO

Exemplo:

```text
PROTETOR

Quando um aliado adjacente recebe ataque:
20% chance de interceptar.

Custo:
+10% dano recebido.
```

Outro:

```text
IMPULSIVO

Quando houver um inimigo dentro do alcance:
+10% dano.

Se houver oportunidade de ataque:
-10% defesa até o próximo turno.
```

---

# 29. EVOLUÇÃO DOS TRAÇOS

Alguns traços podem evoluir por eventos.

Exemplo:

```text
Inseguro
   ↓
sobrevive a 3 missões críticas
   ↓
Resiliente
```

Ou:

```text
Impulsivo
   ↓
falha em missão importante
   ↓
Cauteloso
```

Não transformar isso em um sistema obrigatório para todos.

Usar apenas quando houver evento relevante.

---

# 30. MORTE PERMANENTE

A morte é permanente.

Quando uma unidade chega ao estado de morte:

```text
alive = false
```

Ela deve ser removida das unidades ativas.

Não permitir resurrection padrão.

Não permitir reload automático do personagem.

Não transformar a morte em "incapacitado" se o dano recebido realmente representar morte.

A interface deve registrar:

```text
Status:
MORTO

Data da morte
Missão
Local
Causa
Nível
Classe
Subclasse
Kills
Rescues
Mastery
```

---

# 31. ESTADO DOWNED ≠ MORTE

Para evitar mortes excessivamente arbitrárias, utilizar três estados:

```text
Healthy
↓
Downed
↓
Dead
```

Downed significa incapacitado.

O jogador ainda pode:

- resgatar;
- estabilizar;
- evacuar.

Se permanecer em condição crítica ou sofrer dano adicional, pode morrer.

As regras exatas devem ser configuráveis.

---

# 32. EVACUAÇÃO

Adicionar suporte para evacuação.

Objetivos de missão podem incluir:

> retirar um aliado incapacitado.

Isso torna Support/Rescue relevantes.

Um personagem Downed pode ocupar espaço e alterar a movimentação da equipe.

---

# 33. LEGADO

Quando um veterano morre, gerar um Legacy Record.

```text
Legacy
├── recruit_id
├── name
├── level
├── class
├── subclass
├── quirk
├── achievements
├── missions
├── kills
├── rescues
├── mastery
└── legacy_bonus
```

O legado não ressuscita o personagem.

Ele transforma a morte em memória mecânica.

---

# 34. TIPOS DE LEGADO

Exemplos:

### Instrutor

Novos recrutas recebem:

```text
+5% XP nas primeiras missões
```

### Veterano de Resgate

Especialistas em suporte recebem:

```text
+1 movimento durante evacuação
```

### Estrategista

Unidades novas começam com:

```text
+5% Mastery em técnicas
```

### Mártir

Quando um membro da equipe estiver Downed:

```text
+Will para aliados
```

Os valores devem ser balanceáveis.

---

# 35. LIMITE DE LEGADOS

Não permitir acumular infinitamente todos os bônus.

Criar:

```text
Legacy Capacity
```

ou uma estrutura de:

- legado ativo;
- legado histórico;
- bônus organizacionais.

O jogador deve ter escolhas.

---

# 36. RECRUTAMENTO APÓS MORTE

A perda de uma unidade deve alimentar o ciclo de recrutamento.

Exemplo:

```text
Veterano morto
      ↓
Legacy criado
      ↓
Recruitment Pool atualizado
      ↓
Novos candidatos
      ↓
Treinamento
      ↓
Novo veterano
```

Não gerar automaticamente um substituto idêntico.

---

# 37. POOL DINÂMICO

O pool de recrutas deve considerar o estado da organização.

Exemplo:

Se o jogador perdeu muitos especialistas em Controle:

```text
Controle:
peso +25%
```

Se possui excesso de Suporte:

```text
Suporte:
peso -15%
```

Isso deve ser uma preferência, não uma garantia.

---

# 38. DIVERSIDADE DO POOL

Evitar gerar:

```text
10 recrutas com o mesmo Dom
```

Adicionar mecanismos de diversidade:

- penalidade por repetição recente;
- bônus para famílias pouco representadas;
- diversidade de classe;
- diversidade de raridade.

Mas permitir coincidências.

O jogador pode encontrar irmãos, rivais ou múltiplos usuários de poderes semelhantes.

---

# 39. RECRUTAMENTO NÃO DEVE SER "GACHA"

Não utilizar sistema predatório.

O pool deve ser apresentado como uma lista de candidatos disponíveis.

Exemplo:

```text
CANDIDATOS

01 — Helena
Dom: Vetor
Potencial: ★★★★☆
Afinidade: Controle
Custo: 120

02 — Marcos
Dom: Densidade
Potencial: ★★★☆☆
Afinidade: Impacto
Custo: 80

03 — Livia
Dom: Eco
Potencial: ★★★★★
Afinidade: Suporte
Custo: 180
```

---

# 40. CUSTO DE RECRUTAMENTO

O custo pode depender de:

- nível;
- origem;
- potencial;
- raridade;
- treinamento inicial.

Mas não deve impedir totalmente a experimentação.

Recrutas baratos devem continuar podendo se tornar excelentes.

---

# 41. EQUIPAMENTO E DOM

Equipamento deve complementar o Dom.

Não substituir o Dom.

Exemplo:

```text
DOM: VETOR

Equipamento A:
+alcance

Equipamento B:
-redução de Strain

Equipamento C:
+controle de massa
```

Isso permite construir personagens especializados.

---

# 42. SINERGIA ENTRE PERSONAGENS

Adicionar um sistema simples de Team Synergy.

Cada par de personagens pode possuir:

```text
synergy = 0–100
```

Synergy aumenta através de:

- missões conjuntas;
- proteger o parceiro;
- executar combos;
- completar objetivos;
- eventos.

Em determinados níveis:

```text
25 — diálogo/pequeno bônus
50 — reação combinada
75 — técnica de dupla
100 — técnica especial
```

Não é necessário criar relações românticas ou narrativas complexas para o sistema funcionar.

---

# 43. COMBOS

Skills podem possuir tags.

Exemplo:

```text
Fire
Electric
Kinetic
Binding
Water
Ice
Barrier
Pull
Push
Mark
Dash
```

Uma skill pode consumir uma tag deixada por outra.

Exemplo:

```text
A aplica MARKED
B possui skill:
Marked Target → +30% dano
```

Outro:

```text
A aplica CONDUCTIVE
B aplica ELECTRIC
→ Chain Reaction
```

Isso deve ser baseado em tags genéricas e configuráveis.

---

# 44. NÃO HARDCODAR COMBOS

Criar um sistema:

```text
ComboRule
├── required_tags
├── forbidden_tags
├── trigger
├── effect
├── damage_modifier
├── status_effect
├── animation
└── text
```

Isso permite criar novos combos sem alterar o código principal.

---

# 45. PROGRESSÃO DE NÍVEL

Preservar o sistema existente de nível máximo 60.

A cada nível, utilizar a regra já definida pelo projeto para:

- XP;
- ponto de atributo;
- ponto de skill.

Não criar uma segunda progressão.

O novo sistema deve consumir os Skill Points já existentes.

---

# 46. USO DOS SKILL POINTS

Skill Points podem desbloquear:

- nós de Dom;
- técnicas;
- passivas;
- variantes;
- especializações.

O custo deve depender do nó.

Exemplo:

```text
Basic Node       1 SP
Advanced Node    2 SP
Hybrid Node      3 SP
Ultimate Node    4 SP
Awakening        requisito especial
```

Valores configuráveis.

---

# 47. RESET

O jogador deve possuir uma forma limitada de redistribuir pontos.

Não permitir reset gratuito infinito.

Possíveis soluções:

- item raro;
- treinamento caro;
- evento;
- recurso estratégico.

Isso preserva a importância das escolhas.

---

# 48. INTERFACE DO PERSONAGEM

Criar uma tela com:

```text
================================================
NOME                         LEVEL 32
DOM                          VETOR
POTENCIAL                    ★★★★☆
MASTERIA                     78/100

HP      ██████████
STAMINA ███████░░░
STRAIN  ████░░░░░░

CLASSE       [Controle]
SUBCLASSE    [Manipulador]
FUSÃO        [Grappler]

================================================
ATRIBUTOS

STR  14
DEX  22
SPD  19
INT  26
CON  17

================================================
TEIA

             [ ]
              │
        [●]───┼───[●]
              │
             [ ]

================================================
TRAÇOS
[Observador]
[Protetor]

================================================
TÉCNICAS
1. Vector Pull       Mastery 72
2. Vector Push       Mastery 51
3. Redirect          Mastery 31

================================================
AWAKENING
78 / 90
================================================
```

---

# 49. INTERFACE DE RECRUTAMENTO

Deve mostrar claramente:

- nome;
- origem;
- Dom;
- família;
- raridade;
- potencial;
- afinidades;
- traços conhecidos;
- atributos;
- custo;
- nível;
- informação desconhecida.

Não mostrar potencial oculto se ainda não descoberto.

---

# 50. INFORMAÇÃO OCULTA

Recrutas podem ter:

```text
UNKNOWN
```

em determinadas informações.

Exemplo:

```text
Potencial:
???

Após treinamento:
★★★★☆
```

Isso deve ser controlado por flags.

---

# 51. SALVAMENTO

Todos os elementos abaixo devem ser serializáveis:

- recrutas;
- mortos;
- legados;
- pool de candidatos;
- seed;
- Dom;
- Mastery;
- árvores;
- traços;
- equipamentos;
- relações;
- estado de despertar.

Ao carregar o save, o sistema deve reconstruir exatamente o estado anterior.

---

# 52. DATA-DRIVEN DESIGN

Prioridade máxima:

Dons, skills, classes, subclasses, híbridos, traços e combos devem existir como dados configuráveis.

Evitar:

```text
if quirk == "X":
    ...
```

Preferir:

```text
QuirkData
```

com componentes e efeitos.

O mesmo vale para classes.

---

# 53. ESTRUTURA SUGERIDA

Se o projeto estiver em Godot, uma organização possível:

```text
systems/
    recruitment/
        recruitment_manager.gd
        recruit_generator.gd
        recruitment_pool.gd

    quirks/
        quirk_manager.gd
        quirk_instance.gd
        quirk_effect.gd
        quirk_registry.gd

    progression/
        mastery_manager.gd
        specialization_manager.gd
        awakening_manager.gd

    legacy/
        legacy_manager.gd
        legacy_record.gd

    synergy/
        synergy_manager.gd
        combo_manager.gd
```

Dados:

```text
data/
    quirks/
    classes/
    subclasses/
    hybrids/
    traits/
    skills/
    combos/
    legacies/
```

Adaptar os caminhos aos padrões atuais do projeto.

---

# 54. SEPARAR DEFINIÇÃO DE INSTÂNCIA

Exemplo:

```text
QuirkData
```

define:

> o que é o Dom Vetor.

Enquanto:

```text
QuirkInstance
```

define:

> como Helena possui o Dom Vetor.

Isso é fundamental.

QuirkData:

```text
name
description
base_effects
tags
rarity
mastery_curve
awakening
```

QuirkInstance:

```text
quirk_id
mastery
strain
awakening_state
unlocked_nodes
```

---

# 55. TESTES AUTOMATIZADOS

Criar testes para:

### Recrutamento
- gera candidatos válidos;
- pesos funcionam;
- nenhum campo obrigatório fica vazio.

### Dom
- custo de Strain correto;
- Mastery aumenta;
- Overload funciona;
- recuperação funciona.

### Progressão
- nível 60 não ultrapassa limite;
- Skill Points corretos;
- fusões respeitam requisitos.

### Morte
- personagem morto não pode ser selecionado;
- personagem morto não retorna ao roster;
- Legacy é criado;
- save/load preserva morte.

### Pool
- recrutas contratados desaparecem do pool;
- pool se renova;
- seed reproduz resultados.

### Combos
- tags são detectadas;
- efeitos são aplicados uma única vez;
- combo não dispara recursivamente.

---

# 56. BALANCEAMENTO INICIAL

Não buscar balanceamento perfeito na primeira implementação.

Primeiro garantir:

1. sistema funciona;
2. dados são editáveis;
3. UI permite inspeção;
4. save/load funciona;
5. morte permanente funciona;
6. recrutamento funciona;
7. progressão funciona.

Depois realizar balanceamento.

---

# 57. REGRAS IMPORTANTES DE BALANCEAMENTO

Evitar:

- Dom raro sempre superior;
- personagem novo sempre pior;
- híbrido sempre superior à especialização pura;
- despertar obrigatório para competir;
- suporte inútil;
- controle que impede o inimigo de jogar indefinidamente;
- dano explosivo sem custo;
- regeneração que remove completamente o risco de morte.

O sistema deve produzir trade-offs.

---

# 58. EXEMPLO COMPLETO DE UM RECRUTA

```text
Nome:
Helena Duarte

Nível:
12

Dom:
Vetor

Família:
Manipulação

Raridade:
Raro

Potencial:
★★★★☆

Atributos:
STR 12
DEX 23
SPD 20
INT 24
CON 15

Afinidades:
Impacto 54
Movimento 71
Suporte 32
Controle 88

Classe:
Controle

Subclasse:
Manipulador

Fusão:
Grappler

Mastery:
64

Strain:
21

Traços:
Observadora
Protetora

Skills:
Vector Pull
Vector Push
Redirect

Especialização:
Grappler

```

Build resultante:

> Manipula vetores para puxar inimigos, reposicionar aliados e atravessar o mapa.

Não é apenas "uma personagem com poder de vetor".

Ela possui uma identidade tática.

---

# 59. EXEMPLO DE OUTRO RECRUTA COM O MESMO DOM

```text
Nome:
Caio

Dom:
Vetor

Classe:
Movimento

Subclasse:
Acrobata

Fusão:
Acrobata + Manipulador

```

Esse personagem usa o mesmo Dom para:

- alterar sua própria trajetória;
- aumentar velocidade;
- mudar direção no ar;
- saltar;
- redirecionar projéteis.

Resultado:

Helena e Caio possuem o mesmo Dom.

Mas são unidades completamente diferentes.

Esse é um requisito central do sistema.

---

# 60. EXEMPLO DE MORTE

Helena chega à missão 31.

```text
Level 34
Mastery 89
Fusão: Grappler
Awakening: quase desbloqueado
Kills: 47
Rescues: 19
```

Durante uma missão:

```text
HP → 0
Downed
```

O jogador tenta evacuar.

Falha.

Helena recebe dano adicional.

```text
DEAD
```

Criar:

```text
Legacy:
"Helena, a Vetora"
```

O legado concede:

```text
Recrutas treinados em Controle:
+3% Mastery inicial
```

O personagem desaparece do roster ativo.

O jogador precisa seguir sem ela.

---

# 61. EXPERIÊNCIA DO JOGADOR

O sistema deve produzir situações como:

> "Esse recruta parece mediano, mas o Dom é extremamente interessante."

> "Tenho um personagem com o mesmo Dom do meu veterano morto."

> "Posso treiná-lo na mesma direção, mas ele possui outro potencial."

> "Meu novo recruta tem uma combinação completamente diferente."

> "Esse personagem finalmente despertou."

Esse é o objetivo emocional do sistema.

---

# 62. PRIORIDADE DE IMPLEMENTAÇÃO

Implementar nesta ordem:

## FASE 1
Infraestrutura:

- Recruit data;
- Quirk data;
- Quirk instance;
- Recruitment Manager;
- save/load.

## FASE 2
Progressão:

- Mastery;
- Strain;
- Skill mastery;
- Skill Points;
- subclasses;
- híbridos.

## FASE 3
Combate:

- efeitos de Dom;
- Overload;
- tags;
- combos;
- reações.

## FASE 4
Morte:

- Downed;
- Death;
- permanent death;
- Legacy.

## FASE 5
Meta:

- Recruitment Pool;
- origem;
- reputação;
- diversidade;
- relações.

## FASE 6
Awakening:

- requisitos;
- eventos;
- transformações;
- UI.

## FASE 7
Polimento:

- UI;
- feedback;
- animações;
- efeitos;
- sons;
- balanceamento.

---

# 63. REGRA PARA O CODEX

NÃO reescrever o projeto inteiro para implementar esse documento.

Primeiro:

1. inspecionar a arquitetura atual;
2. identificar sistemas equivalentes;
3. mapear os pontos de integração;
4. propor alterações mínimas;
5. implementar incrementalmente;
6. testar após cada fase.

Não criar sistemas duplicados.

Não remover funcionalidades existentes.

Não alterar assets existentes sem necessidade.

Não alterar o sistema de combate-base sem que a nova mecânica exija.

Quando houver duas maneiras de implementar algo, escolher a que:

- reutiliza código existente;
- mantém os dados data-driven;
- reduz acoplamento;
- facilita balanceamento;
- facilita expansão futura.

---

# 64. CRITÉRIO DE CONCLUSÃO

O sistema será considerado implementado quando for possível:

1. iniciar uma campanha;
2. gerar candidatos;
3. recrutar um candidato;
4. visualizar seu Dom;
5. escolher uma classe;
6. escolher uma subclasse;
7. desbloquear uma fusão;
8. utilizar habilidades do Dom;
9. aumentar Mastery;
10. acumular e reduzir Strain;
11. sofrer Overload;
12. desenvolver o personagem;
13. colocar o personagem em missão;
14. deixá-lo Downed;
15. resgatá-lo;
16. ou perdê-lo permanentemente;
17. gerar automaticamente seu Legacy;
18. contratar novos recrutas;
19. utilizar novos recrutas sem quebrar a progressão;
20. salvar e carregar todo o estado corretamente.

---

# 65. PRINCÍPIO FINAL

O sistema inteiro deve obedecer a esta regra:

> **Nenhum recruta deve ser definido apenas pelo seu Dom.**

O personagem final é o resultado de:

```text
DOM
+
ATRIBUTOS
+
TRAÇOS
+
CLASSE
+
SUBCLASSE
+
FUSÃO
+
TÉCNICAS
+
MASTERIA
+
EQUIPAMENTO
+
EXPERIÊNCIA
+
RELAÇÕES
+
EVENTOS
```

Por consequência:

> dois recrutas com o mesmo Dom podem jogar de maneiras completamente diferentes;

e:

> dois recrutas da mesma classe podem ter funções completamente diferentes.

A morte permanente deve fazer com que o jogador se importe com os veteranos, enquanto o sistema de recrutamento deve garantir que uma derrota nunca signifique o fim da campanha.

O objetivo não é criar uma coleção de personagens poderosos.

O objetivo é criar uma **organização de heróis que aprende, perde membros, forma veteranos, cria legados e continua evoluindo**.

