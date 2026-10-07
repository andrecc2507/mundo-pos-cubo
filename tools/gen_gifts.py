#!/usr/bin/env python3
"""
Gera src/game/data/gifts/gifts.json — o catálogo de Dons (Mundo Pós-Cubo).

Cada linha: id|Nome|família|raridade|termo|elemento|estado|zona|overload|despertar|I|M|S|C|descrição|fraqueza

- termo: entra no nome das técnicas ("Rajada de {termo}").
- elemento/estado/zona: '-' = nenhum. Estado = o que as técnicas de Controle aplicam.
- I/M/S/C: arquétipo de cada filosofia (vazio = padrão da família); ver gift_rules.json.
- As técnicas são montadas por src/game/rules/gifts.ts a partir destes campos.

Rodar: python3 tools/gen_gifts.py
"""
import json
import os

ROWS = r"""
densidade|Densidade|fisico|comum|Densidade|-|derrubado|-|trava|couraca|soco|deslize|escudo|empurrao|Fica pesado como chumbo: golpes que arremessam, corpo que não se move.|Anda menos e afunda na água; quedas machucam mais.
regeneracao|Regeneração|fisico|incomum|Regeneração|-|-|-|fome|imortal|soco|salto|cura|prender|O corpo fecha feridas em segundos — à custa de energia.|Regenerar gasta Stamina; em Overload, desmaia de fome.
forca_explosiva|Força Explosiva|fisico|comum|Força|-|derrubado|-|exaustao|furia|soco|salto|inspirar|empurrao|Músculos que guardam energia e soltam de uma vez: socos que derrubam paredes.|Cada golpe forte desgasta o corpo; os braços doem.
endurecimento|Endurecimento|fisico|comum|Rocha|terra|-|-|trava|couraca|soco|deslize|escudo|prender|A pele vira pedra viva: aguenta tiros e devolve socos.|Endurecido, perde agilidade; em Overload, trava.
elasticidade|Elasticidade|fisico|comum|Borracha|-|imobilizado|-|exaustao|mobilidade|soco|salto|escudo|puxao|O corpo estica e volta: socos de longe, saltos de estilingue.|Corte e calor extremo o machucam muito.
velocidade|Velocidade|fisico|incomum|Velocidade|-|-|-|exaustao|mobilidade|soco|deslize|inspirar|empurrao|Pernas que alcançam velocidades absurdas por segundos.|O corpo esquenta; parar de repente custa caro.
pele_de_aco|Pele de Aço|fisico|incomum|Aço|-|-|-|trava|couraca|soco|deslize|escudo|prender|Uma camada metálica cobre o corpo inteiro.|Eletricidade atravessa o metal; ímãs o atrapalham.
garras|Garras|fisico|comum|Garras|-|sangramento|-|sangramento|furia|soco|salto|inspirar|prender|Garras que saem dos dedos e cortam concreto.|Só funciona de perto; garras quebram com o uso.
asas|Asas|fisico|raro|Asas|vento|-|-|exaustao|mobilidade|soco|salto|inspirar|empurrao|Asas de verdade: voa, plana, ataca do alto.|Asas são alvo fácil; molhadas, pesam.
salto|Salto Potente|fisico|comum|Salto|-|derrubado|-|exaustao|mobilidade|soco|salto|inspirar|empurrao|Pernas de mola: alcança telhados num pulo.|Pousos mal calculados machucam.
mimetismo|Mimetismo|fisico|incomum|Camuflagem|-|cegado|-|cegueira|visao|preciso|fase|inspirar|prender|A pele copia o fundo: some na parede.|Em movimento, a camuflagem falha.
bracos_extras|Braços Extras|fisico|incomum|Braços|-|imobilizado|-|exaustao|furia|soco|salto|escudo|prender|Dois braços a mais saem das costas.|Mais braços, mais fome; o equilíbrio sofre.
corpo_de_borracha|Corpo de Borracha|fisico|comum|Ricochete|-|derrubado|-|exaustao|couraca|soco|salto|escudo|empurrao|Quica de volta de qualquer impacto.|Cortes e fogo atravessam a borracha.
resistencia_dor|Resistência à Dor|fisico|comum|Teimosia|-|-|-|sangramento|imortal|soco|deslize|escudo|prender|Não sente dor: luta até o corpo cair de verdade.|Não percebe quando está morrendo.
adrenalina|Adrenalina|fisico|comum|Adrenalina|-|-|-|exaustao|furia|soco|deslize|inspirar|empurrao|Quanto pior a situação, mais rápido e forte fica.|Quando a adrenalina passa, desaba.
ossos_projeteis|Ossos Projéteis|fisico|incomum|Ossos|-|sangramento|-|sangramento|furia|projetil|salto|escudo|prender|Dispara lascas de osso que crescem de novo.|Cada disparo custa cálcio e dor.
gigantismo|Gigantismo|fisico|raro|Gigante|terra|derrubado|-|exaustao|couraca|soco|salto|escudo|empurrao|Cresce até três metros por alguns minutos.|Grande demais para cobertura; alvo fácil.
encolher|Encolher|fisico|incomum|Miniatura|-|-|-|desmaio|visao|preciso|fase|inspirar|prender|Fica do tamanho de um rato.|Pequeno, bate fraco; um passo errado e é pisado.
sangue_acido|Sangue Ácido|fisico|raro|Ácido|veneno|-|gas|sangramento|furia|rajada|salto|purificar|zona|O sangue corrói metal: quem o fere se queima.|Precisa sangrar para usar o Dom.
folego|Fôlego de Fole|fisico|comum|Sopro|vento|derrubado|-|exaustao|mobilidade|onda|propulsao|inspirar|empurrao|Pulmões enormes: sopra com força de vendaval.|Sem ar, sem Dom; fumaça o sufoca.
cauda|Cauda|fisico|comum|Cauda|-|derrubado|-|exaustao|mobilidade|soco|salto|escudo|empurrao|Uma cauda forte que varre, agarra e equilibra.|A cauda é sensível: golpes nela atordoam.
chifres|Chifres|fisico|comum|Chifres|-|derrubado|-|exaustao|furia|soco|deslize|escudo|empurrao|Chifres de touro: investidas que arrombam portas.|Só ataca em linha reta.
presas|Presas Venenosas|fisico|incomum|Peçonha|veneno|-|-|sangramento|furia|soco|salto|purificar|prender|Mordida com veneno paralisante.|Precisa morder: só de perto.
metabolismo|Metabolismo Acelerado|fisico|comum|Metabolismo|-|-|-|fome|imortal|soco|deslize|cura|empurrao|Digere, cura e se move rápido — e come o triplo.|Sem comida, o Dom apaga.
punho_sismico|Punho Sísmico|fisico|raro|Tremor|terra|derrubado|lama|exaustao|furia|area|salto|escudo|zona|Socos que fazem o chão tremer.|O tremor derruba aliados também.
couraca_ossea|Couraça Óssea|fisico|incomum|Osso|-|-|-|trava|couraca|soco|deslize|escudo|prender|Placas de osso crescem sobre a pele.|Pesada; quebra com marretas e explosões.
recarga|Recarga Corporal|fisico|incomum|Fôlego|-|-|-|desmaio|imortal|soco|deslize|inspirar|empurrao|Recupera o fôlego num piscar de olhos.|Exagerar faz o coração disparar.
corpo_termico|Corpo Térmico|fisico|comum|Calor Corporal|fogo|-|-|queimadura|couraca|soco|deslize|purificar|zona|Aquece o próprio corpo a ponto de evaporar água.|Superaquece: em Overload, queima a si mesmo.
carapaca|Carapaça|fisico|comum|Carapaça|-|-|-|trava|couraca|soco|deslize|escudo|empurrao|Uma carapaça de besouro nas costas e braços.|Lento para virar; costas protegidas, frente não.
hiperflexibilidade|Hiperflexibilidade|fisico|comum|Contorção|-|imobilizado|-|exaustao|mobilidade|soco|fase|inspirar|prender|Passa por qualquer fresta; esquiva impossível.|Juntas frágeis: golpes pesados machucam mais.
investida_bovina|Investida Bovina|fisico|comum|Investida|-|derrubado|-|exaustao|furia|soco|deslize|escudo|empurrao|Corre e atropela como um touro.|Para frear, precisa bater em algo.
tatuagem_viva|Tatuagem Viva|fisico|raro|Tinta|-|imobilizado|tinta|desmaio|guardiao|projetil|salto|escudo|prender|As tatuagens saem da pele e lutam.|Cada tatuagem destruída dói de verdade.
musculo_hidraulico|Músculo Hidráulico|fisico|incomum|Pressão|agua|derrubado|agua|exaustao|furia|soco|propulsao|inspirar|empurrao|Músculos que bombeiam água sob pressão.|Desidrata rápido; precisa beber água.
olho_de_aguia|Olho de Águia|fisico|comum|Mira|-|marcado|-|cegueira|visao|preciso|salto|inspirar|prender|Vista que alcança quilômetros.|Clarões cegam por mais tempo.
pele_refletora|Pele Refletora|fisico|raro|Reflexo|luz|cegado|-|cegueira|couraca|onda|deslize|escudo|prender|A pele espelha a luz e devolve parte dos golpes.|Escuro total desliga o Dom.
eletricidade|Eletricidade|emissor|comum|Eletricidade|eletricidade|atordoado|agua|choque|furia|rajada|propulsao|inspirar|zona|Descargas que saltam entre inimigos molhados ou em metal.|Alcance curto; água espalha a descarga em aliados também.
calor|Calor|emissor|incomum|Chamas|fogo|queimando|fogo|queimadura|furia|rajada|propulsao|purificar|zona|Fogo que sai das mãos — e esquenta o corpo junto.|Superaquece; ineficaz na água.
gelo|Gelo|emissor|comum|Gelo|gelo|congelado|gelo|congelamento|couraca|rajada|deslize|escudo|zona|Cria gelo do ar: paredes, rampas e prisões.|O frio entorpece o próprio corpo.
luz|Luz|emissor|incomum|Luz|luz|cegado|-|cegueira|guardiao|rajada|fase|cura|prender|Emite luz concentrada: cega, cura e queima.|No escuro brilha como um farol — fácil de achar.
som|Som|emissor|comum|Som|vento|atordoado|-|confusao|furia|onda|propulsao|inspirar|zona|Gritos e ondas sonoras que derrubam e atordoam.|Ensurdece a si mesmo; silêncio absoluto o anula.
acido|Ácido|emissor|incomum|Ácido|veneno|-|gas|sangramento|furia|rajada|deslize|purificar|zona|Jatos de ácido que derretem armaduras e coberturas.|O ácido respinga em quem está perto.
plasma|Plasma|emissor|raro|Plasma|fogo|queimando|fogo|queimadura|furia|rajada|propulsao|inspirar|zona|Plasma superaquecido: corta aço como manteiga.|Cada disparo aquece o corpo perigosamente.
vapor|Vapor|emissor|comum|Vapor|agua|cegado|vapor|queimadura|visao|onda|propulsao|cura|zona|Nuvens de vapor fervente que escaldam e escondem.|O vapor queima o próprio usuário se ficar parado nele.
explosao|Explosão|emissor|raro|Explosão|fogo|derrubado|fogo|descontrole|furia|area|propulsao|inspirar|empurrao|Detona explosões nas palmas das mãos.|Cada explosão machuca as mãos; em Overload, explode ao redor.
laser|Laser|emissor|incomum|Laser|luz|-|-|cegueira|furia|preciso|fase|inspirar|prender|Feixes de laser precisos que atravessam alvos em linha.|Precisa de visão limpa; fumaça dispersa o feixe.
radiacao|Radiação|emissor|excepcional|Radiação|veneno|enfraquecido|gas|envelhecer|furia|area|fase|purificar|zona|Emite radiação que enfraquece tudo em volta.|Envenena a si mesmo com o tempo.
pressao_ar|Pressão de Ar|emissor|comum|Pressão|vento|derrubado|-|exaustao|mobilidade|onda|propulsao|inspirar|empurrao|Comprime o ar e solta de uma vez: rajadas que arremessam.|Em lugares fechados, o ar volta contra ele.
vento|Vento|emissor|comum|Vento|vento|derrubado|-|exaustao|mobilidade|onda|propulsao|inspirar|empurrao|Correntes de vento cortantes.|Vento espalha fumaça e fogo para os dois lados.
lama|Lama|emissor|comum|Lama|terra|lento|lama|exaustao|guardiao|rajada|deslize|escudo|zona|Cria lama espessa que prende pés e enche buracos.|A lama também prende os aliados.
agua|Água|emissor|comum|Água|agua|derrubado|agua|exaustao|guardiao|rajada|deslize|cura|zona|Jatos de água com pressão de mangueira de incêndio.|Água conduz eletricidade — inclusive a inimiga.
chama_azul|Chama Azul|emissor|excepcional|Chama Azul|fogo|queimando|fogo|queimadura|furia|rajada|propulsao|inspirar|zona|Fogo azul, mais quente que qualquer outro.|Queima a própria pele a cada uso.
nevoa|Névoa|emissor|comum|Névoa|agua|cegado|fumaca|confusao|visao|onda|fase|inspirar|zona|Cobre a área com névoa espessa.|A névoa esconde os aliados também da mira deles.
fumaca|Fumaça|emissor|comum|Fumaça|-|cegado|fumaca|confusao|visao|onda|fase|inspirar|zona|Exala fumaça densa pela boca e pelas mãos.|Tosse e perde fôlego com o uso.
polvora|Pólvora|emissor|incomum|Pólvora|fogo|derrubado|fogo|descontrole|furia|area|propulsao|inspirar|zona|Suor de pólvora: faíscas viram explosões.|Água o desarma; fogo perto o detona.
esporos|Esporos|emissor|incomum|Esporos|veneno|envenenado|esporos|confusao|guardiao|onda|fase|cura|zona|Libera esporos que envenenam ou acalmam.|O vento leva os esporos para onde quiser.
feromonio|Feromônio|emissor|raro|Feromônio|-|confuso|-|confusao|visao|onda|fase|inspirar|prender|Cheiros que deixam os inimigos confusos ou dóceis.|Não afeta quem não respira (máscaras, máquinas).
faiscas|Faíscas|emissor|comum|Faíscas|eletricidade|atordoado|-|choque|furia|projetil|propulsao|inspirar|prender|Pequenas faíscas que pulam de alvo em alvo.|Fracas sozinhas; perigosas com combustível perto.
pulso_em|Pulso Eletromagnético|emissor|raro|Pulso|eletricidade|silenciado|-|choque|visao|onda|fase|inspirar|zona|Pulsos que desligam máquinas, rádios e Dons elétricos.|Desliga também o equipamento aliado.
ondas_choque|Ondas de Choque|emissor|incomum|Choque|terra|derrubado|-|exaustao|furia|onda|propulsao|escudo|empurrao|Bate palmas e solta uma onda que derruba tudo.|A onda empurra aliados também.
laminas_ar|Lâminas de Ar|emissor|incomum|Lâminas|vento|sangramento|-|sangramento|furia|projetil|propulsao|inspirar|prender|Cortes de vento invisíveis.|Precisa de espaço para girar os braços.
agulhas|Agulhas|emissor|comum|Agulhas|-|sangramento|-|sangramento|furia|projetil|salto|purificar|prender|Dispara agulhas finas como uma metralhadora.|Fracas contra armadura.
seda|Seda|emissor|comum|Seda|-|imobilizado|-|exaustao|mobilidade|projetil|salto|escudo|puxao|Fios de seda resistentes como aço.|Fogo queima a seda num segundo.
tinta|Tinta|emissor|comum|Tinta|-|cegado|tinta|confusao|visao|projetil|fase|inspirar|zona|Jatos de tinta que cegam e marcam.|Não causa dano de verdade.
cinzas|Cinzas|emissor|comum|Cinzas|fogo|cegado|fumaca|queimadura|visao|onda|fase|inspirar|zona|Nuvens de cinza quente.|Suja tudo: aliados perdem a mira também.
brasas|Brasas|emissor|comum|Brasas|fogo|queimando|fogo|queimadura|furia|projetil|propulsao|inspirar|zona|Brasas que grudam e continuam queimando.|Se apagam na chuva.
cristais|Cristais|emissor|incomum|Cristal|-|sangramento|-|sangramento|couraca|projetil|deslize|escudo|zona|Cristais afiados que crescem do chão e das mãos.|Quebradiços: martelos os estilhaçam.
oleo|Óleo|emissor|comum|Óleo|-|derrubado|oleo|exaustao|mobilidade|projetil|deslize|inspirar|zona|Espirra óleo escorregadio — e inflamável.|Uma faísca e tudo pega fogo, inclusive ele.
nectar|Néctar Curativo|emissor|incomum|Néctar|-|-|-|fome|guardiao|projetil|deslize|cura|prender|Produz um néctar que cura feridas.|Curar demais esgota o próprio corpo.
bioluminescencia|Bioluminescência|emissor|comum|Brilho|luz|cegado|-|cegueira|visao|onda|fase|inspirar|prender|Brilha no escuro como um vaga-lume.|Impossível se esconder brilhando.
infravermelho|Calor Infravermelho|emissor|incomum|Infravermelho|fogo|queimando|-|queimadura|visao|rajada|fase|inspirar|prender|Raios de calor invisíveis.|Não passa por vidro grosso.
micro_ondas|Micro-ondas|emissor|raro|Micro-ondas|fogo|queimando|-|queimadura|furia|rajada|fase|inspirar|prender|Esquenta o alvo por dentro.|Metal reflete as ondas de volta.
gas_sonifero|Gás Sonífero|emissor|raro|Sono|veneno|sono|gas|desmaio|visao|onda|fase|cura|zona|Um gás que faz dormir.|Respira um pouco do próprio gás a cada uso.
veneno|Veneno|emissor|incomum|Veneno|veneno|envenenado|gas|sangramento|furia|rajada|fase|purificar|zona|Produz venenos variados.|Antídotos e máscaras anulam.
eco_termico|Onda de Calor|emissor|comum|Mormaço|fogo|lento|vapor|queimadura|guardiao|onda|propulsao|inspirar|zona|Uma onda de calor sufocante.|Cansa o próprio corpo.
vetor|Vetor|manipulador|raro|Vetor|-|derrubado|-|desmaio|mobilidade|area|salto|inspirar|puxao|Muda a direção de forças: arremessa, puxa, redireciona.|Precisa de alvo à vista; alvos grandes custam o dobro.
gravidade|Gravidade|manipulador|raro|Gravidade|-|imobilizado|-|trava|guardiao|area|salto|inspirar|prender|Aumenta ou anula a gravidade de uma área.|Afeta aliados dentro da área.
magnetismo|Magnetismo|manipulador|incomum|Magnetismo|eletricidade|imobilizado|-|choque|guardiao|area|propulsao|escudo|puxao|Atrai e repele metal: armas, carros, gente de armadura.|Inútil contra quem não usa metal.
atrito|Atrito|manipulador|comum|Atrito|-|derrubado|oleo|exaustao|mobilidade|area|deslize|inspirar|zona|Zera ou multiplica o atrito: chão de gelo ou cola.|Escorrega junto se não tomar cuidado.
impulso|Impulso|manipulador|comum|Impulso|-|derrubado|-|desmaio|mobilidade|soco|propulsao|inspirar|empurrao|Guarda o impulso dos golpes e devolve tudo de uma vez.|Precisa receber golpes para acumular.
inercia|Inércia|manipulador|incomum|Inércia|-|imobilizado|-|trava|couraca|area|deslize|escudo|prender|Congela o movimento de um objeto ou pessoa.|Só um alvo por vez.
temperatura|Temperatura|manipulador|raro|Temperatura|gelo|congelado|gelo|congelamento|guardiao|area|deslize|purificar|zona|Esquenta ou esfria o que toca.|Mudanças bruscas machucam a si mesmo.
hidrocinese|Hidrocinese|manipulador|incomum|Correnteza|agua|derrubado|agua|exaustao|guardiao|rajada|deslize|cura|puxao|Controla a água que já existe em volta.|Sem água por perto, quase nada.
geocinese|Geocinese|manipulador|incomum|Terra|terra|derrubado|parede|exaustao|couraca|area|salto|escudo|zona|Move terra e pedra: paredes, rampas, pilares.|Concreto e asfalto custam o dobro.
metalocinese|Metalocinese|manipulador|raro|Metal|-|imobilizado|-|trava|guardiao|projetil|propulsao|escudo|puxao|Molda metal como argila.|Precisa de metal por perto.
aerocinese|Aerocinese|manipulador|incomum|Ventania|vento|derrubado|-|exaustao|mobilidade|onda|propulsao|inspirar|empurrao|Controla o vento em volta.|Espaços fechados limitam o Dom.
fitocinese|Fitocinese|manipulador|incomum|Raízes|terra|imobilizado|-|fome|guardiao|area|salto|cura|prender|Faz plantas crescerem e agarrarem.|No asfalto, precisa de vasos e rachaduras.
corrosao|Corrosão|manipulador|incomum|Ferrugem|veneno|enfraquecido|-|envelhecer|furia|area|fase|purificar|zona|Enferruja e apodrece o que toca.|Não escolhe: estraga as próprias armas também.
rotacao|Rotação|manipulador|comum|Rotação|-|confuso|-|confusao|mobilidade|soco|propulsao|inspirar|empurrao|Faz coisas (e gente) girarem sem parar.|Fica tonto se usar demais.
repulsao|Repulsão|manipulador|comum|Repulsão|-|derrubado|-|exaustao|couraca|onda|propulsao|escudo|empurrao|Empurra tudo para longe de si.|Não consegue puxar nada.
atracao|Atração|manipulador|comum|Atração|-|imobilizado|-|exaustao|guardiao|area|salto|escudo|puxao|Puxa tudo para perto.|Atrai golpes também.
deslize|Deslize|manipulador|comum|Deslize|-|derrubado|oleo|exaustao|mobilidade|soco|deslize|inspirar|zona|Desliza em qualquer superfície como se fosse gelo.|Parar é difícil.
pressao|Pressão|manipulador|raro|Pressão|-|imobilizado|-|trava|furia|area|salto|escudo|prender|Aumenta a pressão do ar sobre o alvo até esmagá-lo.|Concentração total: não se move enquanto aperta.
ressonancia|Ressonância|manipulador|raro|Ressonância|-|atordoado|-|confusao|furia|onda|fase|inspirar|zona|Faz objetos vibrarem até quebrar.|O próprio corpo vibra junto.
peso|Peso|manipulador|comum|Peso|-|lento|-|trava|couraca|area|deslize|escudo|prender|Deixa coisas mais leves ou mais pesadas.|Cansa rápido com alvos grandes.
adesao|Adesão|manipulador|comum|Cola|-|imobilizado|-|trava|guardiao|projetil|salto|escudo|prender|Faz qualquer coisa grudar.|Gruda nas próprias coisas também.
vidrocinese|Vidrocinese|manipulador|incomum|Vidro|-|sangramento|-|sangramento|couraca|projetil|deslize|escudo|zona|Molda vidro: janelas viram lâminas.|Precisa de vidro ou areia.
areia|Areia|manipulador|comum|Areia|terra|cegado|lama|exaustao|guardiao|onda|deslize|escudo|zona|Controla a areia: tempestades e dunas.|Molhada, a areia pesa e não obedece.
correntes|Correntes Elétricas|manipulador|incomum|Corrente|eletricidade|atordoado|agua|choque|furia|rajada|propulsao|inspirar|puxao|Desvia correntes elétricas de fios e postes.|Precisa de energia por perto.
hemocinese|Hemocinese|manipulador|excepcional|Sangue|-|sangramento|-|sangramento|imortal|projetil|fase|cura|prender|Controla o sangue — o próprio e o alheio.|Usar o próprio sangue enfraquece.
fios|Fios|manipulador|comum|Fios|-|imobilizado|-|exaustao|mobilidade|projetil|salto|escudo|puxao|Controla fios e cabos como tentáculos.|Fios cortados param de obedecer.
equilibrio|Equilíbrio|manipulador|incomum|Equilíbrio|-|derrubado|-|desmaio|mobilidade|soco|salto|inspirar|empurrao|Mexe no equilíbrio dos outros: todo mundo cai.|Não afeta quem está deitado.
eletromagnetismo|Eletromagnetismo|manipulador|excepcional|Campo|eletricidade|imobilizado|-|choque|guardiao|area|propulsao|escudo|puxao|Campo eletromagnético que segura balas no ar.|Desliga os próprios equipamentos.
ondas|Ondas|manipulador|comum|Onda|agua|derrubado|agua|exaustao|guardiao|onda|deslize|cura|empurrao|Cria ondas no chão como se fosse água.|Derruba quem estiver perto, aliado ou não.
calor_objetos|Termocinese|manipulador|incomum|Calor|fogo|queimando|fogo|queimadura|furia|area|deslize|purificar|zona|Esquenta objetos até ficarem em brasa.|O calor volta pelas mãos.
barreira|Barreira|criador|comum|Barreira|-|imobilizado|parede|desfaz|guardiao|projetil|salto|escudo|zona|Cria barreiras translúcidas que param balas.|Barreiras quebram; não ataca diretamente.
forja|Forja|criador|incomum|Forja|-|-|-|trava|furia|projetil|salto|escudo|prender|Cria armas e ferramentas com metal.|Precisa de matéria-prima; objetos duram pouco.
plataformas|Plataformas|criador|comum|Plataforma|-|derrubado|-|desfaz|mobilidade|projetil|salto|escudo|empurrao|Cria plataformas no ar para subir e cobrir.|Plataformas caem quando ele se distrai.
correntes_criadas|Correntes|criador|comum|Corrente|-|imobilizado|-|exaustao|guardiao|projetil|salto|escudo|puxao|Correntes de aço que saem das mãos.|Pesadas: cansam o braço.
concreto|Concreto|criador|incomum|Concreto|terra|imobilizado|parede|desfaz|couraca|projetil|deslize|escudo|zona|Cria muros de concreto em segundos.|O concreto demora a secar: o primeiro turno é frágil.
espinhos|Espinhos|criador|comum|Espinhos|-|sangramento|-|sangramento|furia|projetil|salto|escudo|zona|Faz espinhos brotarem do chão.|Espinhos ferem aliados que passarem.
cordas|Cordas|criador|comum|Corda|-|imobilizado|-|exaustao|mobilidade|projetil|salto|escudo|puxao|Cria cordas resistentes — laço, rede, tirolesa.|Fogo e lâminas cortam fácil.
clones|Clones|criador|raro|Clone|-|confuso|-|desmaio|guardiao|soco|fase|inspirar|prender|Cria cópias de si que lutam por alguns segundos.|Os clones dividem a dor quando caem.
bonecos|Bonecos|criador|incomum|Boneco|-|confuso|-|desfaz|guardiao|projetil|fase|escudo|prender|Cria bonecos que atraem tiros.|Os bonecos não aguentam nada.
torres|Torres|criador|incomum|Torre|-|-|-|desfaz|guardiao|projetil|salto|escudo|zona|Ergue torres de pedra para subir e atirar.|Torres caem se a base for destruída.
escudos_luz|Escudos de Luz|criador|incomum|Escudo de Luz|luz|cegado|-|cegueira|guardiao|rajada|fase|escudo|prender|Escudos de luz sólida em volta dos aliados.|No escuro, os escudos são fracos.
bolhas|Bolhas|criador|comum|Bolha|agua|imobilizado|agua|desfaz|guardiao|projetil|salto|escudo|prender|Bolhas resistentes que prendem ou protegem.|Furam com objetos pontudos.
armadilhas_dom|Armadilhas|criador|incomum|Armadilha|-|imobilizado|-|desfaz|guardiao|projetil|salto|escudo|zona|Cria armadilhas invisíveis no chão.|Esquece onde pôs: aliados podem pisar.
granadas_bio|Granadas Biológicas|criador|raro|Granada|veneno|envenenado|gas|descontrole|furia|area|salto|cura|zona|Produz frutos que explodem em gás ou cura.|Se for atingido, carrega as granadas no corpo.
gelo_estrutural|Gelo Estrutural|criador|incomum|Gelo|gelo|congelado|gelo|congelamento|couraca|projetil|deslize|escudo|zona|Constrói pontes, muros e rampas de gelo.|O calor derrete tudo rápido.
pontes|Pontes|criador|comum|Ponte|-|-|-|desfaz|mobilidade|projetil|salto|escudo|empurrao|Cria passarelas entre prédios.|Uma ponte é um caminho para o inimigo também.
cupula|Cúpula|criador|raro|Cúpula|-|-|-|desfaz|guardiao|projetil|fase|escudo|prender|Ergue uma cúpula que protege um grupo.|Dentro da cúpula, ninguém atira para fora.
papel|Papel|criador|comum|Papel|-|cegado|-|desfaz|mobilidade|projetil|salto|inspirar|prender|Folhas de papel afiadas como navalha.|Água e fogo acabam com o papel.
espelhos|Espelhos|criador|raro|Espelho|luz|cegado|-|cegueira|visao|rajada|fase|escudo|prender|Espelhos que refletem tiros e luz.|Espelhos quebram e cortam quem estiver perto.
laminas|Lâminas|criador|incomum|Lâmina|-|sangramento|-|sangramento|furia|projetil|salto|inspirar|prender|Cria lâminas que flutuam em volta.|Só uma lâmina por vez sob controle fino.
balas|Munição Viva|criador|incomum|Bala|-|-|-|exaustao|furia|projetil|salto|inspirar|prender|Cria munição com o próprio corpo — nunca fica sem balas.|Cada bala custa um pouco de vida.
ferramentas|Ferramentas|criador|comum|Ferramenta|-|-|-|desfaz|guardiao|projetil|salto|cura|prender|Cria a ferramenta certa para cada problema.|Ferramentas somem depois de usadas.
remedio|Remédio|criador|incomum|Remédio|-|-|-|fome|guardiao|projetil|deslize|cura|prender|Produz remédios, curativos e antídotos.|Não sabe fazer o mesmo remédio duas vezes seguidas.
teia|Teia|criador|comum|Teia|-|imobilizado|-|exaustao|mobilidade|projetil|salto|escudo|puxao|Atira teias grudentas.|Fogo queima a teia.
muro_terra|Muro de Terra|criador|comum|Muro|terra|-|parede|exaustao|couraca|projetil|deslize|escudo|zona|Levanta muros de terra do chão.|Em pisos de metal, não funciona.
holograma|Holograma|criador|raro|Holograma|luz|confuso|-|confusao|visao|rajada|fase|inspirar|prender|Ilusões de luz que enganam os olhos.|Sensoriais enxergam através das ilusões.
abrigo|Abrigo|criador|incomum|Abrigo|-|-|-|desfaz|guardiao|projetil|deslize|cura|zona|Monta abrigos e trincheiras instantâneas.|Lento para montar: o primeiro turno é vulnerável.
eco|Eco|sensorial|incomum|Eco|vento|atordoado|-|confusao|visao|onda|deslize|inspirar|zona|Ouve tudo pelo eco; grita com força de canhão.|Barulho alto o cega por um turno.
rastro|Rastro|sensorial|comum|Rastro|-|marcado|-|cegueira|visao|preciso|deslize|inspirar|prender|Marca um alvo e nunca mais o perde.|Quase nada contra quem nunca viu.
raio_x|Visão de Raio-X|sensorial|incomum|Raio-X|-|marcado|-|cegueira|visao|preciso|fase|inspirar|prender|Vê através de paredes.|Dor de cabeça forte depois de muito uso.
visao_termica|Visão Térmica|sensorial|comum|Calor|-|marcado|-|cegueira|visao|preciso|fase|inspirar|prender|Vê o calor dos corpos, até no escuro.|Fogo e vapor ofuscam.
precognicao|Precognição|sensorial|raro|Presságio|-|-|-|confusao|visao|preciso|fase|inspirar|prender|Vê alguns segundos do futuro.|Ver demais confunde o presente.
leitura_movimento|Leitura de Movimento|sensorial|incomum|Leitura|-|derrubado|-|confusao|mobilidade|soco|deslize|inspirar|empurrao|Prevê golpes pelo movimento do corpo.|Não lê quem não se mexe.
audicao|Audição Absoluta|sensorial|comum|Audição|-|atordoado|-|confusao|visao|preciso|deslize|inspirar|prender|Ouve batimentos a cem metros.|Explosões ensurdecem por mais tempo.
olfato|Olfato Apurado|sensorial|comum|Faro|-|marcado|-|confusao|visao|preciso|deslize|purificar|prender|Fareja medo, sangue e pólvora.|Fumaça e perfume o confundem.
radar|Radar|sensorial|incomum|Radar|eletricidade|-|-|choque|visao|preciso|fase|inspirar|prender|Sente tudo num raio de cinquenta metros.|Interferência elétrica cria fantasmas no radar.
visao_distante|Visão Distante|sensorial|comum|Lonjura|-|marcado|-|cegueira|visao|preciso|salto|inspirar|prender|Enxerga longe como binóculo.|De perto, a visão fica turva.
ponto_fraco|Ponto Fraco|sensorial|raro|Ponto Fraco|-|enfraquecido|-|confusao|furia|preciso|deslize|inspirar|prender|Vê o ponto fraco de qualquer coisa.|Precisa de tempo para enxergar.
empatia|Empatia|sensorial|incomum|Empatia|-|confuso|-|confusao|guardiao|preciso|fase|cura|prender|Sente o que os outros sentem — e acalma ou apavora.|Sente a dor dos aliados também.
telepatia|Telepatia|sensorial|raro|Mente|-|confuso|-|confusao|guardiao|preciso|fase|inspirar|prender|Fala dentro da cabeça das pessoas.|Mentes caóticas o machucam.
detector|Detector de Dons|sensorial|incomum|Detecção|-|silenciado|-|confusao|visao|preciso|fase|inspirar|prender|Sente Dons em uso — e atrapalha quem usa.|Inútil contra quem não tem Dom.
sentido_perigo|Sentido de Perigo|sensorial|comum|Alerta|-|-|-|confusao|visao|preciso|deslize|escudo|prender|Um arrepio antes de cada ataque.|Em perigo constante, o alerta vira ruído.
mapa_mental|Mapa Mental|sensorial|comum|Mapa|-|-|-|confusao|mobilidade|preciso|deslize|inspirar|prender|Memoriza o terreno inteiro de uma olhada.|Lugares que mudam (desabamentos) o confundem.
analise|Análise|sensorial|incomum|Análise|-|enfraquecido|-|confusao|visao|preciso|deslize|inspirar|prender|Analisa o inimigo e acha a falha da defesa.|Precisa observar antes de agir.
sincronia|Sincronia|sensorial|raro|Sincronia|-|-|-|desmaio|guardiao|preciso|fase|inspirar|prender|Liga a mente à de um aliado: os dois lutam como um.|O que fere um, fere o outro.
ecolocalizacao|Ecolocalização|sensorial|comum|Sonar|vento|atordoado|-|confusao|visao|onda|deslize|inspirar|zona|Estala a língua e vê pelo som.|Silêncio absoluto ou barulho total o cegam.
leitura_intencao|Leitura de Intenção|sensorial|raro|Intenção|-|-|-|confusao|visao|preciso|fase|escudo|prender|Sabe o que o inimigo vai fazer antes dele.|Não funciona com animais.
marcador|Marcador|sensorial|comum|Marca|-|marcado|-|cegueira|visao|preciso|deslize|inspirar|prender|Marca alvos para o esquadrão inteiro.|A marca some se perder o alvo de vista.
visao_360|Visão 360|sensorial|incomum|Panorama|-|-|-|cegueira|visao|preciso|deslize|escudo|prender|Vê em todas as direções ao mesmo tempo.|Clarões o cegam completamente.
tato_sismico|Tato Sísmico|sensorial|incomum|Tremor|terra|derrubado|-|confusao|visao|area|deslize|inspirar|zona|Sente passos pelo chão.|Não sente quem voa ou flutua.
calculo_balistico|Cálculo Balístico|sensorial|raro|Balística|-|-|-|confusao|furia|preciso|deslize|inspirar|prender|Calcula trajetórias perfeitas: tiros que fazem curva.|Muitos cálculos causam enxaqueca.
hipercognicao|Hipercognição|sensorial|excepcional|Cognição|-|confuso|-|confusao|visao|preciso|fase|inspirar|prender|Pensa mil vezes mais rápido.|O corpo não acompanha a mente.
troca|Troca|anomalo|excepcional|Troca|-|confuso|-|desmaio|mobilidade|preciso|troca|inspirar|troca|Troca de lugar com o que estiver à vista.|Precisa de algo do outro lado.
pausa|Pausa|anomalo|lendario|Pausa|-|imobilizado|-|envelhecer|dominio|preciso|fase|inspirar|prender|Para o tempo de um alvo por um instante.|Muito caro; envelhece um pouco a cada uso.
teletransporte|Teletransporte|anomalo|excepcional|Salto Espacial|-|confuso|-|desmaio|mobilidade|preciso|troca|inspirar|troca|Aparece em outro lugar num piscar de olhos.|Só para onde já viu.
duplicacao|Duplicação|anomalo|raro|Duplicata|-|confuso|-|desmaio|guardiao|soco|fase|inspirar|prender|Divide-se em dois por alguns segundos.|Cada cópia sente a dor da outra.
intangibilidade|Intangibilidade|anomalo|excepcional|Fase|sombra|-|-|desmaio|imortal|preciso|fase|escudo|prender|Atravessa paredes e balas.|Intangível, também não pode tocar em nada.
sorte|Sorte|anomalo|raro|Sorte|-|-|-|confusao|imortal|preciso|deslize|inspirar|prender|Tudo dá certo — por enquanto.|A sorte acaba de repente.
reversao|Reversão|anomalo|lendario|Reversão|-|-|-|envelhecer|dominio|preciso|fase|cura|prender|Volta um objeto ou pessoa alguns segundos no tempo.|Volta junto as próprias feridas antigas.
copia|Cópia|anomalo|excepcional|Cópia|-|silenciado|-|confusao|dominio|preciso|fase|inspirar|prender|Copia o Dom de quem toca por um instante.|Cópia imperfeita: o Overload vem mais rápido.
anulacao|Anulação|anomalo|lendario|Anulação|-|silenciado|-|cegueira|dominio|preciso|deslize|inspirar|prender|Olha para alguém e apaga o Dom dele.|Precisa manter o olhar; os olhos ardem.
probabilidade|Probabilidade|anomalo|excepcional|Acaso|-|derrubado|-|confusao|dominio|preciso|fase|inspirar|prender|Mexe nas chances: tiros erram, quedas acontecem.|O azar volta para ele depois.
portais|Portais|anomalo|lendario|Portal|sombra|-|-|desmaio|mobilidade|preciso|troca|inspirar|troca|Abre portais entre dois pontos.|O portal fica aberto para o inimigo também.
espaco|Compressão Espacial|anomalo|lendario|Espaço|-|imobilizado|-|envelhecer|dominio|area|troca|inspirar|puxao|Encolhe o espaço entre as coisas.|Distorce a própria percepção.
inversao|Inversão|anomalo|raro|Inversão|-|confuso|-|confusao|dominio|preciso|troca|inspirar|empurrao|Inverte coisas: cima vira baixo, ataque vira cura.|Às vezes inverte a si mesmo.
vinculo_dor|Vínculo de Dor|anomalo|raro|Vínculo|sombra|-|-|sangramento|imortal|preciso|fase|cura|prender|Liga a dor de um inimigo à própria.|Sente tudo junto.
sono|Sono|anomalo|raro|Sono|-|sono|-|desmaio|visao|preciso|fase|cura|prender|Faz dormir com um toque.|Dorme junto se exagerar.
memoria|Memória|anomalo|excepcional|Memória|-|confuso|-|confusao|visao|preciso|fase|inspirar|prender|Apaga lembranças recentes: o inimigo esquece o que ia fazer.|Esquece coisas também.
sombra_viva|Sombra Viva|anomalo|excepcional|Sombra|sombra|cegado|fumaca|confusao|furia|area|fase|inspirar|prender|A própria sombra ganha vida e luta.|Sem luz, não há sombra.
gravidade_zero|Gravidade Zero|anomalo|raro|Flutuação|-|derrubado|-|desmaio|mobilidade|area|salto|inspirar|empurrao|Desliga a gravidade de uma área.|Flutua junto se ficar perto.
espelho_dom|Espelho de Dom|anomalo|lendario|Espelho|-|-|-|cegueira|dominio|preciso|fase|escudo|prender|Devolve o Dom que o atinge.|Precisa ser atingido para usar.
distorcao|Distorção|anomalo|excepcional|Distorção|-|confuso|-|confusao|visao|area|troca|inspirar|zona|Distorce a luz e o espaço: nada está onde parece.|Os aliados também se perdem.
atraso|Atraso|anomalo|excepcional|Atraso|-|lento|-|envelhecer|dominio|preciso|fase|inspirar|prender|Atrasa o tempo de quem toca.|O próprio tempo fica mais lento depois.
aceleracao|Aceleração Temporal|anomalo|lendario|Pressa|-|-|-|envelhecer|dominio|preciso|fase|inspirar|prender|Acelera o próprio tempo: age duas vezes.|Envelhece a cada uso.
desmaterializar|Desmaterialização|anomalo|lendario|Desmanche|sombra|enfraquecido|-|envelhecer|furia|area|fase|purificar|zona|Desmancha matéria em pó.|Pode desmanchar a si mesmo.
"""

FAMILY = {
    'fisico': 'Físico',
    'emissor': 'Emissor',
    'manipulador': 'Manipulador',
    'criador': 'Criador',
    'sensorial': 'Sensorial',
    'anomalo': 'Anômalo',
}


def opt(v):
    return None if v in ('-', '') else v


def main():
    out = []
    seen = set()
    for line in ROWS.strip().splitlines():
        parts = line.split('|')
        if len(parts) != 16:
            raise SystemExit(f'linha com {len(parts)} campos: {line[:60]}')
        gid, name, fam, rar, term, el, st, zone, ov, aw, i, m, s, c, desc, weak = parts
        if gid in seen:
            raise SystemExit(f'id repetido: {gid}')
        if fam not in FAMILY:
            raise SystemExit(f'família desconhecida: {fam}')
        seen.add(gid)
        g = {'id': gid, 'name': name, 'family': fam, 'rarity': rar, 'term': term, 'overload': ov, 'awakening': aw, 'description': desc, 'weakness': weak}
        for k, v in (('element', el), ('status', st), ('zone', zone)):
            if opt(v):
                g[k] = v
        kit = {k: v for k, v in (('impacto', i), ('movimento', m), ('suporte', s), ('controle', c)) if opt(v)}
        if kit:
            g['kit'] = kit
        out.append(g)
    path = os.path.join(os.path.dirname(__file__), '..', 'src', 'game', 'data', 'gifts', 'gifts.json')
    with open(path, 'w', encoding='utf-8') as f:
        f.write('[\n' + ',\n'.join(' ' + json.dumps(g, ensure_ascii=False) for g in out) + '\n]\n')
    by = {}
    for g in out:
        by[g['family']] = by.get(g['family'], 0) + 1
    print(len(out), 'Dons', by)


if __name__ == '__main__':
    main()
