"""
Catálogo central de Dons (Mundo Pós-Cubo) — 335 Dons em 14 categorias, do documento do diretor.

Cada linha de ROWS:
  número|nome|raridade|P|C|V|origem|descrição|estágio I;estágio II;estágio III|Despertar|Limitação

- raridade: comum, incomum, raro, epico, lendario, anomalo.
- P/C/V: Potência, Controle e Versatilidade de base (1–10). Cada portador sorteia em volta disso.
- origem: id de um Dom que já existia (a mecânica, a inata e a assinatura dele são reaproveitadas)
  ou '+' para um Dom novo (id = nome sem acento; mecânica em gift_catalog_new.py).
- Limitação '=' reaproveita a fraqueza do Dom de origem.

Usado por tools/gen_catalog.py.
"""

CATEGORIES = [
    # (número romano, nome, primeiro, último, família da árvore)
    ('I', 'Físicos', 1, 35, 'fisico'),
    ('II', 'Energia', 36, 70, 'emissor'),
    ('III', 'Elementais', 71, 100, 'emissor'),
    ('IV', 'Psíquicos', 101, 130, 'sensorial'),
    ('V', 'Matéria', 131, 160, 'manipulador'),
    ('VI', 'Transformação', 161, 190, 'fisico'),
    ('VII', 'Espaço', 191, 205, 'anomalo'),
    ('VIII', 'Tempo', 206, 215, 'anomalo'),
    ('IX', 'Sentidos', 216, 235, 'sensorial'),
    ('X', 'Criação', 236, 255, 'criador'),
    ('XI', 'Controle', 256, 280, 'manipulador'),
    ('XII', 'Mobilidade', 281, 295, 'fisico'),
    ('XIII', 'Suporte', 296, 315, 'criador'),
    ('XIV', 'Anômalos', 316, 335, 'anomalo'),
]

ROWS = r"""
1|Força Amplificada|comum|8|4|3|forca_explosiva|Aumenta significativamente a força muscular.|Força aumentada;Golpes concentrados;Força extrema|Impacto que não acaba: a força continua empurrando depois do golpe.|=
2|Resistência Sobre-Humana|comum|5|5|3|resistencia_dor|Aumenta a resistência física.|Resistência elevada;Redução de dano;Resistência extrema|O corpo se recusa a cair enquanto houver um aliado de pé.|=
3|Velocidade Extrema|incomum|6|5|5|velocidade|Aumenta a velocidade de deslocamento.|Corrida acelerada;Aceleração explosiva;Velocidade extrema|Rastro de velocidade: deixa imagens de si que confundem o inimigo.|=
4|Reflexos Aprimorados|comum|4|7|4|+|Aumenta o tempo de reação.|Reação rápida;Antecipação;Resposta quase instantânea|Reflexo absoluto: devolve o golpe antes de ele chegar.|Reagir a tudo cansa: estímulos demais o deixam confuso.
5|Agilidade Sobre-Humana|comum|4|7|6|hiperflexibilidade|Aumenta coordenação e mobilidade.|Esquiva fluida;Acrobacias;Movimento impossível|O corpo encontra o único caminho livre em qualquer lugar.|=
6|Salto Potenciado|comum|5|5|4|salto|Saltos muito acima da capacidade humana.|Salto alto;Salto em sequência;Salto de impacto|Salta no ar como se houvesse chão.|=
7|Endurecimento|comum|5|6|4|endurecimento|Aumenta a resistência dos tecidos.|Pele dura;Endurecer partes;Corpo de pedra|O endurecimento passa para o que ele toca.|=
8|Densidade Corporal|incomum|7|5|6|densidade|Altera a densidade do corpo: extremamente pesado ou leve.|Corpo pesado;Peso variável;Leve como pena, duro como chumbo|Muda a densidade de quem ele agarra.|=
9|Elasticidade|comum|5|6|7|elasticidade|Deformação e alongamento corporal.|Esticar;Estilingue;Corpo de mola|Absorve qualquer impacto esticando — e devolve.|=
10|Corpo Maleável|comum|4|6|6|corpo_de_borracha|Deforma o corpo sem sofrer lesões.|Corpo mole;Ricochete;Quique perfeito|Escorre por frestas e se refaz do outro lado.|=
11|Corpo Cristalino|raro|7|5|5|+|Transforma parte ou todo o corpo em cristal.|Pele de cristal;Armas de cristal;Corpo de cristal|O cristal refrata a luz: raios que o acertam se dividem e voltam.|Golpes pesados racham o cristal; o som agudo o machuca.
12|Corpo Metálico|incomum|6|5|4|pele_de_aco|Transforma o corpo em metal.|Pele de aço;Punhos de metal;Corpo inteiro de aço|Liga metálica viva: o metal se refaz sozinho.|=
13|Corpo Mineral|incomum|6|4|4|couraca_ossea|Transforma o corpo em material semelhante a pedra.|Placas de pedra;Couraça mineral;Corpo de rocha|Funde-se ao chão e se torna parte do terreno.|=
14|Corpo Gasoso|raro|4|6|7|+|Transforma o corpo em gás.|Braço de névoa;Meio gasoso;Corpo de gás|Espalha-se pela área e solidifica em qualquer ponto dela.|Vento forte o dispersa; fogo o machuca muito.
15|Corpo Líquido|raro|5|6|7|+|Assume forma líquida.|Escorrer;Forma de água;Corpo líquido|Entra no corpo do inimigo e o afoga por dentro.|Calor o evapora; frio o congela.
16|Corpo Energético|epico|8|4|6|+|Converte parcialmente o corpo em energia.|Mãos de energia;Meio-energia;Corpo de energia|Vira energia pura e atravessa cabos e fios.|Gasta Stamina só para existir; isolantes o bloqueiam.
17|Regeneração|incomum|3|5|4|regeneracao|Acelera a recuperação de ferimentos.|Fechar cortes;Regeneração em combate;Regeneração contínua|Regenera até um membro perdido no meio da luta.|=
18|Regeneração Avançada|raro|4|6|5|+|Recupera ferimentos graves.|Ossos que se soldam;Órgãos que se refazem;Quase imortal|Volta do limite da morte uma vez por batalha.|A fome cresce a cada cura; sem comida, o Dom para.
19|Adaptação Biológica|incomum|4|5|7|+|O organismo desenvolve resistência contra condições adversas.|Resistir a venenos;Resistir a elementos;Imunidade aprendida|O corpo aprende cada golpe que recebe.|Adapta-se devagar: o primeiro golpe de cada tipo dói inteiro.
20|Adaptação Térmica|comum|4|5|4|corpo_termico|Resistência extrema a calor e frio.|Pele térmica;Aquecer o corpo;Imunidade térmica|Irradia a temperatura que absorveu.|=
21|Adaptação Aquática|comum|4|6|5|+|Respiração e movimentação subaquática.|Respirar na água;Nadar rápido;Corpo aquático|Arrasta quem está na água para o fundo.|Seca fora d'água: ambientes secos o enfraquecem.
22|Adaptação Atmosférica|comum|4|5|4|folego|Sobrevive em ambientes com pouco oxigênio.|Fôlego longo;Pulmões de fole;Respirar qualquer ar|Sopro capaz de varrer uma rua.|=
23|Metabolismo Acelerado|comum|4|5|5|metabolismo|Processamento energético extremamente rápido.|Digestão rápida;Energia rápida;Metabolismo extremo|Converte comida em cura instantânea.|=
24|Longevidade|incomum|2|7|4|+|Reduz drasticamente o envelhecimento.|Células jovens;Recuperação lenta e certa;Corpo que não decai|Rejuvenesce o próprio corpo no meio da luta.|Sem efeito ofensivo; depende do que aprendeu na vida.
25|Imunidade Ampliada|comum|3|6|4|+|Resistência excepcional a doenças e toxinas.|Resistir a venenos;Purificar o sangue;Imunidade total|O sangue dele cura toxinas de quem tocar.|Não ajuda contra golpes; só contra o que entra no corpo.
26|Absorção de Impacto|incomum|5|6|5|+|Absorve a força física recebida.|Amortecer;Guardar impacto;Absorção total|Devolve todo o impacto guardado num único golpe.|Só absorve o que é físico; energia o atravessa.
27|Armazenamento Cinético|incomum|6|5|5|impulso|Acumula energia produzida pelo movimento.|Guardar movimento;Carregar correndo;Reserva cinética|A energia guardada vira um escudo em volta.|=
28|Descarga Cinética|incomum|7|4|4|+|Libera energia cinética acumulada.|Soltar impulso;Descarga em linha;Explosão cinética|A descarga continua em ondas.|Precisa se mover antes para ter o que soltar.
29|Amplificação Muscular|comum|7|4|3|musculo_hidraulico|Aumenta temporariamente massa muscular e força.|Músculos inchados;Força hidráulica;Forma colossal|Os músculos endurecem como armadura.|=
30|Corpo Predatório|incomum|6|5|5|garras|Aumenta força, sentidos e reflexos ao entrar em combate.|Garras;Instinto de caça;Predador perfeito|Fareja o mais fraco e não o deixa escapar.|=
31|Forma Bestial|raro|7|4|4|investida_bovina|Transforma o usuário em uma criatura poderosa.|Traços animais;Meia-fera;Fera completa|A fera e o usuário lutam como um só.|=
32|Forma Monstruosa|epico|9|2|4|+|Transformação extremamente poderosa, mas difícil de controlar.|Pele monstruosa;Meio-monstro;Monstro|Controla o monstro sem perder a razão.|Pode atacar aliados quando em Overload.
33|Adaptação de Combate|raro|5|6|7|adrenalina|O corpo se adapta gradualmente ao estilo do adversário.|Aprender o golpe;Contramedida;Adaptação total|Cada golpe recebido o deixa mais forte contra aquele inimigo.|=
34|Crescimento Corporal|raro|8|3|4|gigantismo|Aumenta tamanho e massa.|Crescer;Gigante;Colosso|Cresce sem perder agilidade.|=
35|Redução Corporal|incomum|3|7|6|encolher|Diminui tamanho e massa.|Encolher;Miniatura;Microscópico|Encolhe outros com um toque.|=
36|Projeção Energética|comum|6|5|4|+|Dispara rajadas de energia.|Rajada;Rajada contínua;Rajada perfurante|A rajada faz curva atrás do alvo.|Concentrar energia aquece as mãos.
37|Canhão Energético|raro|9|3|3|+|Concentra energia em ataques extremamente destrutivos.|Carga;Canhão;Canhão total|Dispara sem precisar carregar.|Precisa de um turno de carga; fica exposto.
38|Explosão Energética|raro|8|4|4|explosao|Libera energia em área.|Estouro;Explosão;Detonação|Explode sem se ferir.|=
39|Pulso Energético|comum|5|5|5|repulsao|Produz ondas de energia.|Pulso;Pulso em anel;Pulso em cadeia|O pulso atravessa paredes.|Pulsos fracos de longe; precisa estar no meio da luta.
40|Absorção Energética|raro|4|6|6|+|Absorve energia externa.|Absorver choques;Absorver raios;Absorção total|Devolve em dobro o que absorveu.|Golpes físicos não têm o que absorver.
41|Conversão Energética|raro|5|6|8|+|Transforma uma forma de energia em outra.|Calor em luz;Luz em força;Qualquer energia|Converte o golpe inimigo em cura.|Sem energia em volta, não há o que converter.
42|Armazenamento Energético|incomum|5|6|5|recarga|Armazena energia para utilização posterior.|Bateria;Reserva;Bateria viva|Libera toda a reserva de uma vez.|=
43|Descarga Energética|incomum|7|4|4|+|Libera energia acumulada.|Descarga;Descarga em arco;Descarga total|A descarga salta de alvo em alvo.|Fica vazio depois de descarregar.
44|Campo Energético|raro|5|6|6|+|Cria uma área carregada de energia.|Campo;Campo carregado;Campo vivo|O campo segue o usuário.|Parado no meio do campo, vira alvo.
45|Barreira Energética|comum|3|6|5|barreira|Cria escudos de energia.|Escudo;Parede;Domo|A barreira devolve os tiros.|=
46|Lâmina Energética|incomum|7|6|4|laminas|Forma armas utilizando energia.|Faca de energia;Espada de energia;Arsenal de energia|A lâmina corta à distância.|=
47|Corrente Energética|incomum|5|6|5|correntes|Mantém um fluxo contínuo de energia.|Fluxo;Cabo vivo;Rede de corrente|Redireciona qualquer corrente elétrica do mapa.|=
48|Esfera Energética|comum|6|5|4|+|Cria projéteis esféricos.|Esfera;Esferas em órbita;Chuva de esferas|As esferas ficam no campo como minas.|Esferas lentas: alvos rápidos desviam.
49|Onda de Choque|incomum|6|5|4|ondas_choque|Produz impacto sem contato direto.|Palma;Onda;Onda em anel|A onda derruba prédios.|=
50|Pulso Eletromagnético|raro|4|6|5|pulso_em|Interrompe equipamentos eletrônicos.|Desligar;Pulso;Apagão|Desliga também os Dons em volta.|=
51|Manipulação Eletromagnética|epico|6|7|8|eletromagnetismo|Controla campos eletromagnéticos.|Campo;Segurar balas;Tempestade magnética|Vira o próprio campo magnético.|=
52|Eletricidade|comum|6|5|5|eletricidade|Produz e controla eletricidade.|Faísca;Descarga;Tempestade elétrica|A eletricidade vira sua armadura.|=
53|Plasma|raro|9|4|4|plasma|Produz matéria altamente energizada.|Jato;Lâmina de plasma;Sol em miniatura|O plasma fica no campo queimando.|=
54|Radiação|epico|7|4|5|radiacao|Emite ou manipula radiação.|Aura;Feixe;Zona radioativa|Absorve a radiação de volta e se cura.|=
55|Absorção Radioativa|raro|5|5|5|+|Utiliza radiação como fonte de energia.|Absorver;Brilhar;Reator vivo|Fica mais forte perto de ruínas e do Cubo.|Longe de radiação, enfraquece.
56|Energia Solar|incomum|5|5|6|+|Absorve luz e converte em energia.|Absorver luz;Raio solar;Painel vivo|Guarda o sol para lutar à noite.|À noite e em lugares fechados, quase não funciona.
57|Energia Cósmica|lendario|10|5|7|+|Manipula uma forma extremamente poderosa de energia.|Brilho cósmico;Feixe cósmico;Estrela|Abre um rasgo de energia que apaga tudo em linha.|Cada uso cobra muito do corpo.
58|Energia Vital|raro|6|6|6|+|Converte energia biológica em ataques ou habilidades.|Golpe vital;Roubo de vida;Fluxo vital|Doa a própria vida para salvar um aliado.|Usa a própria vida como combustível.
59|Projeção Térmica|incomum|6|5|4|micro_ondas|Emite calor concentrado.|Calor;Raio de calor;Fervura interna|Aquece o alvo por dentro, sem defesa possível.|=
60|Absorção Térmica|incomum|4|6|5|eco_termico|Absorve calor do ambiente.|Esfriar;Absorver chamas;Onda térmica|Devolve todo o calor absorvido em ondas.|=
61|Conversão de Calor|raro|5|6|6|+|Transforma calor em energia utilizável.|Calor em força;Calor em velocidade;Motor térmico|Converte o fogo inimigo em ação extra.|No frio fica sem combustível.
62|Emissão Luminosa|comum|4|5|6|luz|Produz luz intensa.|Brilho;Clarão;Sol portátil|A luz cura aliados que toca.|=
63|Feixe Luminoso|incomum|7|7|3|laser|Concentra luz em ataques.|Feixe;Laser;Laser que atravessa|O feixe ricocheteia em superfícies.|=
64|Manipulação de Som|comum|5|6|6|som|Controla ondas sonoras.|Grito;Onda sonora;Orquestra|Cria silêncio e barulho onde quiser.|=
65|Explosão Sônica|incomum|8|3|4|+|Libera energia sonora destrutiva.|Estalo;Estrondo;Bomba sônica|A explosão quebra vidro e osso.|Ensurdece a si mesmo; silêncio o anula.
66|Vibração|incomum|6|6|5|ondas|Faz matéria vibrar.|Tremor;Vibrar objetos;Chão em ondas|Vibra o alvo até desmontar.|=
67|Ressonância|raro|6|7|6|ressonancia|Amplifica vibrações já existentes.|Ressoar;Quebrar vidro;Ressonância total|Cada golpe aliado faz o alvo ressoar.|=
68|Absorção Sonora|incomum|3|7|5|+|Remove sons de determinada área.|Abafar;Bolha de silêncio;Silêncio total|O silêncio impede Dons de som e gritos de comando.|Sem som, também não ouve os aliados.
69|Amplificação Vocal|comum|5|5|5|eco|Transforma a voz em uma arma.|Voz alta;Grito;Voz de canhão|A voz comanda aliados no meio da batalha.|=
70|Frequência Destrutiva|raro|8|5|4|+|Produz ondas capazes de romper materiais.|Zumbido;Frequência;Frequência de ruptura|Rompe qualquer cobertura com um zumbido.|A frequência também machuca quem está perto.
71|Pirocinese|incomum|7|5|6|calor|Produz e controla fogo.|Chama;Controle de trajetória;Zona de combustão|Combustão interna: o fogo nasce sem chama.|=
72|Criocinese|comum|6|6|6|gelo|Produz e controla gelo.|Gelo;Paredes de gelo;Inverno|Congela o próprio tempo do alvo.|=
73|Hidrocinese|incomum|5|6|7|hidrocinese|Controla água.|Jato;Ondas;Maré|Puxa a água do corpo do inimigo.|=
74|Aerocinese|incomum|5|6|7|aerocinese|Controla ar.|Rajada;Correntes;Furacão|Tira o ar dos pulmões do inimigo.|=
75|Geocinese|incomum|6|5|7|geocinese|Controla terra.|Pedras;Muros;Terremoto|O chão inteiro vira sua arma.|=
76|Metalocinese|raro|6|6|7|metalocinese|Controla metais.|Mover metal;Moldar armas;Estruturas de metal|Campo magnético próprio: controla tudo que é metal em volta.|=
77|Cristalocinese|incomum|6|6|5|cristais|Produz e controla cristais.|Lascas;Cristais no chão;Floresta de cristal|Os cristais refletem e multiplicam raios.|=
78|Areia|comum|4|6|6|areia|Produz e controla areia.|Punhado;Tempestade;Mar de areia|Engole o inimigo na areia movediça.|=
79|Vapor|comum|5|5|5|vapor|Produz e controla vapor.|Jato;Nuvem;Caldeira|O vapor vira propulsão.|=
80|Fumaça|comum|3|5|5|fumaca|Produz fumaça controlável.|Fumaça;Cortina;Fumaça viva|A fumaça sufoca quem está dentro.|=
81|Névoa|comum|3|6|5|nevoa|Cria campos de névoa.|Névoa;Campo de névoa;Névoa densa|Some e reaparece na névoa.|=
82|Ácido|incomum|6|5|5|acido|Produz substâncias corrosivas.|Jato;Poça;Corrosão total|O ácido derrete a armadura para sempre.|=
83|Veneno|incomum|6|5|5|veneno|Produz toxinas.|Toxina;Nuvem tóxica;Veneno escolhido|Escolhe o efeito do veneno.|=
84|Gás Tóxico|raro|6|4|5|gas_sonifero|Libera gases nocivos.|Gás;Nuvem;Nuvem que se move|O gás segue os inimigos.|=
85|Planta|incomum|5|6|7|fitocinese|Controla vegetação.|Raízes;Trepadeiras;Floresta|As plantas lutam sozinhas.|=
86|Madeira|incomum|5|5|5|+|Produz estruturas vegetais resistentes.|Estacas;Muralha de madeira;Árvore viva|A madeira brota e cura quem se apoia nela.|Queima fácil; fogo é sua ruína.
87|Espinhos|comum|5|5|4|espinhos|Produz estruturas perfurantes.|Espinho;Campo de espinhos;Floresta de espinhos|Os espinhos voltam a crescer sozinhos.|=
88|Fungos|incomum|4|5|6|esporos|Produz e controla fungos.|Esporos;Colônia;Micélio|O fungo toma conta da mente do alvo.|=
89|Cinzas|comum|4|5|4|cinzas|Produz e manipula cinzas.|Cinza;Nuvem quente;Tempestade de cinzas|As cinzas reacendem tudo que tocam.|=
90|Magma|raro|8|4|5|brasas|Produz e controla material vulcânico.|Brasas;Rocha derretida;Vulcão|O magma esfria e vira muralha.|=
91|Cinética de Água|incomum|6|6|4|agua|Manipula água através de pressão e movimento.|Jato;Jato de corte;Pressão total|A água corta aço.|=
92|Tempestade|epico|8|4|7|+|Combina vento, eletricidade e pressão atmosférica.|Ventania;Chuva elétrica;Tempestade|Vira o olho do furacão.|Atinge aliados no meio da tempestade.
93|Relâmpago|raro|8|5|4|faiscas|Manipula descargas atmosféricas.|Faísca;Raio;Relâmpago em cadeia|O raio cai onde ele mandar, sem aviso.|=
94|Pressão Atmosférica|incomum|5|6|5|pressao_ar|Controla a pressão do ar.|Bolsão;Rajada;Esmagar|Esmaga uma área com o peso do céu.|=
95|Gravidade|raro|7|6|8|gravidade|Altera intensidade e direção gravitacional.|Peso;Direção;Zonas gravitacionais|Múltiplos campos gravitacionais ao mesmo tempo.|=
96|Luz|incomum|4|6|7|bioluminescencia|Manipula luz existente.|Brilho;Dobrar a luz;Ilusões de luz|Dobra a luz em volta e some.|=
97|Sombra|raro|6|6|6|sombra_viva|Manipula regiões de baixa luminosidade.|Sombras;Sombra viva;Mar de sombras|Atravessa de sombra em sombra.|=
98|Calor|incomum|5|6|5|calor_objetos|Controla temperatura.|Esquentar;Brasa;Fornalha|Esquenta tudo que é metal no mapa.|=
99|Frio|incomum|5|6|5|+|Remove energia térmica.|Esfriar;Gelar;Zero absoluto|Congela o movimento de quem está perto.|O frio também entorpece o próprio corpo.
100|Combustão|raro|8|4|5|polvora|Transforma matéria combustível em explosões.|Faísca;Detonar;Reação em cadeia|Tudo que queima vira bomba.|=
101|Telepatia|raro|3|7|6|telepatia|Comunicação mental.|Falar na mente;Coordenar;Rede mental|Conecta o esquadrão inteiro numa mente só.|=
102|Leitura Mental|raro|3|7|5|leitura_intencao|Acessa pensamentos.|Ouvir pensamentos;Ler planos;Ler tudo|Sabe o próximo passo de todos em volta.|=
103|Controle Mental|lendario|6|7|6|+|Controla as ações de outro indivíduo.|Empurrão mental;Comando;Marionete|Controla mais de um ao mesmo tempo.|Mentes fortes resistem; romper o controle dói nos dois.
104|Sugestão Mental|incomum|3|6|5|feromonio|Implanta comandos.|Sugerir;Convencer;Ordem|A sugestão continua depois que ele sai.|=
105|Bloqueio Mental|raro|3|7|5|+|Impede determinados pensamentos ou ações.|Travar uma ideia;Bloquear técnicas;Bloqueio total|Bloqueia o Dom de quem ele olha.|Precisa manter o foco; um golpe forte quebra o bloqueio.
106|Manipulação de Memória|epico|3|8|6|memoria|Altera ou remove memórias.|Esquecer;Apagar;Reescrever|Apaga a batalha da cabeça do inimigo.|=
107|Ilusão Mental|raro|3|7|7|holograma|Cria percepções falsas.|Imagem falsa;Cenário falso;Mundo falso|A ilusão machuca de verdade.|=
108|Confusão Mental|incomum|4|5|5|+|Desorganiza pensamentos.|Distrair;Confundir;Caos mental|Confusão contagiosa.|Confunde a si mesmo em Overload.
109|Paralisia Psíquica|raro|4|6|4|+|Interrompe temporariamente a capacidade de agir.|Travar;Paralisar;Paralisia em área|Paralisa quem tentar agir contra ele.|Exige contato visual.
110|Empatia|incomum|3|6|5|empatia|Detecta emoções.|Sentir;Acalmar;Contágio emocional|Sente a dor dos aliados e a divide.|=
111|Manipulação Emocional|raro|4|6|6|+|Altera emoções.|Acalmar;Inflamar;Dominar o coração|Inverte o medo dos aliados em coragem.|Emoções fortes demais escapam do controle.
112|Indução de Medo|incomum|5|5|4|+|Provoca medo intenso.|Arrepio;Pânico;Terror|O terror se espalha sozinho.|Quem não tem medo de nada é imune.
113|Indução de Sono|raro|4|6|4|sono|Coloca alvos para dormir.|Sonolência;Sono;Sono profundo|Dormir com um olhar.|=
114|Indução de Fúria|incomum|5|4|4|+|Aumenta a agressividade.|Irritar;Fúria;Fúria cega|A fúria vira contra os próprios aliados do alvo.|A fúria induzida também deixa o alvo mais forte.
115|Calmaria Mental|comum|2|7|5|+|Reduz emoções negativas.|Acalmar;Paz;Serenidade|A calma impede o inimigo de atacar.|Sem efeito ofensivo direto.
116|Ataque Psíquico|raro|7|5|4|+|Causa dano diretamente à mente.|Pontada;Golpe mental;Explosão mental|Ignora qualquer armadura.|Gasta muito; dores de cabeça fortes.
117|Defesa Psíquica|incomum|2|7|4|+|Protege contra ataques mentais.|Barreira mental;Mente fechada;Fortaleza mental|Devolve ataques mentais.|Não protege do físico.
118|Projeção Astral|epico|4|7|7|+|Projeta a consciência.|Sair do corpo;Explorar;Lutar em espírito|O espírito ataca enquanto o corpo descansa.|O corpo fica indefeso enquanto projeta.
119|Detecção Mental|comum|2|6|4|detector|Detecta mentes.|Sentir mentes;Contar inimigos;Mapa mental|Sente mentes através de paredes.|=
120|Rastreamento Mental|incomum|3|6|4|rastro|Localiza indivíduos.|Marcar;Seguir;Nunca perder|Sabe onde o alvo está em qualquer lugar.|=
121|Mente Coletiva|epico|4|7|7|sincronia|Conecta múltiplas consciências.|Ligar;Sincronizar;Mente coletiva|O esquadrão age como um só.|=
122|Compartilhamento Sensorial|incomum|2|6|6|+|Compartilha visão, audição e outras percepções.|Ver pelos olhos;Ouvir pelos ouvidos;Sentidos de todos|Todo o esquadrão vê o que um vê.|Dor compartilhada: sente os ferimentos dos ligados.
123|Memória Compartilhada|incomum|2|7|5|+|Transfere informações diretamente entre mentes.|Passar uma ideia;Ensinar;Memória de grupo|Ensina técnicas no meio da luta.|Lembranças ruins também passam.
124|Presença Psíquica|raro|5|5|5|+|Projeta uma presença mental que intimida ou distrai.|Pressão;Presença;Domínio do ambiente|Ninguém consegue tirar os olhos dele.|Chama atenção de todos — inclusive dos tiros.
125|Dominação Psíquica|lendario|7|6|6|+|Assume controle de múltiplos indivíduos.|Comandar um;Comandar vários;Exército|Os dominados lutam até o fim por ele.|Cada mente controlada pesa na sua.
126|Projeção Mental|raro|6|6|6|+|Materializa efeitos psíquicos no ambiente.|Mão mental;Lança mental;Construções mentais|A mente vira matéria.|Concentração total: qualquer dano quebra a projeção.
127|Escudo Mental|incomum|2|7|4|+|Protege o usuário e aliados próximos.|Escudo;Bolha mental;Fortaleza|Ninguém do esquadrão pode ser controlado.|Não para balas.
128|Anulação Psíquica|epico|3|7|5|+|Interrompe poderes baseados em atividade mental.|Silenciar;Anular;Zona morta|Anula todos os Dons mentais em volta.|Também cala os Dons mentais aliados.
129|Leitura Emocional|incomum|3|6|5|leitura_movimento|Identifica intenções através das emoções.|Ler a raiva;Prever;Saber o golpe|Sabe quem vai atacar e quando.|=
130|Percepção Psíquica|incomum|2|6|5|sentido_perigo|Detecta alterações mentais e energéticas.|Arrepio;Sentir Dons;Sexto sentido|Pressente o próximo golpe.|=
131|Telecinese|raro|6|6|8|+|Move objetos sem contato.|Mover;Arremessar;Levitar tudo|Ergue o próprio corpo e voa.|Peso demais estoura a cabeça; precisa ver o alvo.
132|Telecinese Precisa|incomum|4|9|5|calculo_balistico|Manipula pequenos objetos com precisão extrema.|Mover balas;Desarmar;Precisão total|Desvia balas no ar.|=
133|Telecinese Maciça|epico|9|3|5|+|Move objetos enormes.|Mover carros;Erguer escombros;Erguer prédios|Arranca um prédio inteiro e joga.|Lento: precisa de tempo para erguer.
134|Compressão|incomum|6|5|4|pressao|Reduz o volume de objetos.|Apertar;Esmagar;Compressão total|Comprime o ar e explode.|=
135|Expansão|incomum|5|5|5|+|Aumenta o volume de objetos.|Inchar;Expandir;Explosão de volume|Expande uma bala dentro da arma.|Coisas grandes demais caem em cima dele.
136|Alteração de Densidade|raro|5|6|7|peso|Modifica a densidade da matéria.|Mais pesado;Mais leve;Densidade total|Faz o chão virar água e a água virar chão.|=
137|Transmutação|epico|5|6|9|+|Transforma um material em outro.|Pedra em barro;Metal em vidro;Qualquer em qualquer|Transmuta o corpo do inimigo.|Precisa tocar; transmutar cansa a mente.
138|Desintegração|lendario|9|5|3|desmaterializar|Desfaz matéria.|Esfarelar;Desfazer;Pó|Desintegra em área.|=
139|Reestruturação|raro|3|7|7|+|Reconstrói matéria.|Consertar;Reconstruir;Erguer de novo|Reconstrói aliados como objetos.|Reconstruir leva tempo.
140|Duplicação Material|raro|4|6|7|espelhos|Cria cópias temporárias de objetos.|Copiar;Duplicar;Arsenal copiado|Copia as armas do inimigo.|=
141|Fusão Material|incomum|4|6|6|adesao|Une objetos diferentes.|Grudar;Fundir;Fusão total|Funde o inimigo ao chão.|=
142|Separação Material|incomum|5|6|5|corrosao|Separa componentes de objetos.|Soltar;Desmontar;Separar tudo|Separa a armadura do corpo.|=
143|Soldagem|comum|4|6|4|forja|Une matéria por contato.|Soldar;Forjar;Ferreiro|Solda armas novas na hora.|=
144|Amolecimento|incomum|5|5|5|deslize|Reduz a resistência de materiais.|Amolecer;Chão mole;Tudo mole|Paredes viram gelatina.|=
145|Endurecimento Material|incomum|3|6|5|concreto|Aumenta a resistência de materiais.|Endurecer;Muro;Fortaleza|Torna a cobertura indestrutível.|=
146|Cristalização|raro|6|5|5|vidrocinese|Transforma matéria em cristal.|Cristalizar;Prisão de cristal;Tudo cristal|Cristaliza o inimigo.|=
147|Petrificação|epico|6|5|4|+|Transforma matéria orgânica em material mineral.|Endurecer;Petrificar membros;Estátua|Petrifica com o olhar.|Precisa de tempo e contato; olhos vendados o anulam.
148|Magnetismo|incomum|5|6|6|magnetismo|Atrai ou repele materiais magnéticos.|Atrair;Repelir;Campo magnético|Para tudo que é metal no ar.|=
149|Manipulação de Fibra|comum|4|6|6|seda|Controla tecidos e fibras.|Fios;Rede;Casulo|As roupas do inimigo o prendem.|=
150|Manipulação de Madeira|comum|4|5|5|+|Controla madeira existente.|Mover madeira;Lanças de madeira;Casa viva|Toda madeira do mapa lhe obedece.|Sem madeira em volta, sem Dom.
151|Manipulação de Areia|comum|4|6|5|lama|Controla partículas minerais.|Lama;Pântano;Terra viva|O chão engole os inimigos.|=
152|Manipulação de Poeira|comum|3|6|5|+|Controla partículas pequenas.|Poeira;Cortina;Tempestade de poeira|A poeira entra em armas e olhos.|Chuva gruda a poeira no chão.
153|Controle de Metal|raro|6|6|6|correntes_criadas|Manipula metais.|Correntes;Prender;Rede de aço|Correntes que saem do chão.|=
154|Controle de Vidro|incomum|5|6|5|papel|Manipula vidro.|Cacos;Lâminas;Chuva de vidro|Cada janela do mapa vira arma.|=
155|Controle de Cristal|incomum|5|6|5|+|Manipula cristais.|Mover cristais;Lanças;Cristais do Cubo|Usa os cristais do Cubo como armas.|Sem cristais por perto, precisa criá-los primeiro.
156|Controle de Plástico|comum|3|6|6|+|Manipula materiais poliméricos.|Moldar;Prender;Envolver|Plástico derretido que prende e queima.|Fogo derrete o plástico antes da hora.
157|Controle de Borracha|comum|3|6|5|+|Manipula materiais elásticos.|Esticar;Quicar;Ricochete|Transforma o chão em trampolim.|Cortes e calor estragam a borracha.
158|Controle de Líquidos|incomum|4|6|6|oleo|Manipula líquidos diversos.|Derramar;Escorregar;Incendiar|Todo líquido do mapa obedece.|=
159|Controle de Gases|incomum|4|6|6|+|Manipula gases.|Desviar gás;Concentrar;Bolsões|Rouba o ar de uma sala inteira.|Vento forte desfaz o controle.
160|Controle de Partículas|raro|5|7|7|+|Manipula matéria particulada.|Partículas;Nuvem cortante;Desmontar|Desfaz e refaz objetos.|Concentração constante.
161|Metamorfose|raro|5|6|9|+|Altera a forma corporal.|Mudar traços;Mudar forma;Qualquer forma|Muda de forma no meio do golpe.|Mudar demais confunde a própria mente.
162|Transformação Animal|incomum|6|5|5|chifres|Assume características animais.|Chifres;Investida;Fera|Corpo de touro inteiro.|=
163|Mimetismo|incomum|4|6|6|mimetismo|Copia a aparência externa.|Camuflar;Imitar;Cópia perfeita|Imita até a voz do inimigo.|=
164|Camuflagem|comum|3|6|5|tinta|Torna-se difícil de visualizar.|Manchar;Camuflar;Sumir na paisagem|Marca os inimigos para o esquadrão.|=
165|Invisibilidade|raro|4|7|5|+|Remove a presença visual.|Desaparecer;Ficar invisível;Invisível em movimento|Torna aliados invisíveis.|Ainda faz barulho e deixa pegadas.
166|Forma Aquática|comum|4|5|5|+|Desenvolve características aquáticas.|Guelras;Nadadeiras;Fera aquática|Leva a água consigo.|Fora d'água seca e cansa.
167|Forma Aviária|raro|5|5|5|asas|Desenvolve asas e capacidades aéreas.|Asas;Voo;Senhor dos céus|Mergulho que atravessa.|=
168|Forma Felina|incomum|5|6|5|+|Aumenta agilidade e reflexos.|Garras;Agilidade felina;Pantera|Cai sempre de pé — e atacando.|Pouca resistência; golpes pesados machucam muito.
169|Forma Canina|comum|5|5|4|olfato|Aumenta sentidos e capacidades físicas.|Faro;Mordida;Matilha|Lidera aliados como matilha.|=
170|Forma Réptil|comum|4|5|5|cauda|Aumenta resistência e aderência.|Escamas;Cauda;Réptil|Troca de pele e se cura.|=
171|Forma Insetoide|incomum|5|5|6|carapaca|Desenvolve características de insetos.|Carapaça;Pernas extras;Inseto|Sobe paredes e voa curto.|=
172|Forma Predatória|incomum|6|5|5|presas|Aumenta capacidades durante o combate.|Presas;Veneno;Predador|Fica mais forte a cada abate.|=
173|Forma Colossal|epico|10|2|3|+|Aumenta drasticamente o tamanho.|Grande;Gigante;Colossal|Vira um colosso que pisa em prédios.|Alvo gigante; não cabe em lugar nenhum.
174|Forma Compacta|comum|3|6|5|+|Reduz tamanho.|Pequeno;Compacto;Miniatura|Cabe dentro da armadura inimiga.|Golpes fracos; pequeno demais para carregar algo.
175|Forma Gasosa|raro|4|6|7|+|Transforma o corpo em gás.|Névoa;Gás;Nuvem viva|Sufoca quem envolve.|Vento o espalha.
176|Forma Líquida|raro|5|6|6|+|Transforma o corpo em líquido.|Água;Fluxo;Onda viva|Atravessa grades e frestas.|Frio o congela no lugar.
177|Forma Energética|epico|8|5|6|+|Transforma o corpo em energia.|Brilho;Energia;Raio vivo|Viaja na velocidade da luz por um instante.|Gasta energia sem parar.
178|Forma Cristalina|raro|6|5|5|pele_refletora|Transforma o corpo em cristal.|Facetas;Reflexo;Diamante|Reflete raios para onde quiser.|=
179|Forma Metálica|raro|6|5|4|+|Transforma o corpo em metal.|Pele de ferro;Punhos de aço;Estátua de aço|Funde-se ao metal em volta.|Pesado e lento; eletricidade dói muito.
180|Forma Mineral|incomum|6|4|4|punho_sismico|Transforma o corpo em pedra/mineral.|Pele de pedra;Punhos de rocha;Golem|Faz o chão tremer a cada passo.|=
181|Forma Sombria|epico|6|6|6|+|Transforma o corpo em matéria sombria.|Mãos de sombra;Meio-sombra;Corpo de sombra|Some nas sombras e ataca de dentro delas.|Luz forte o queima e o expõe.
182|Forma Luminosa|epico|6|6|6|chama_azul|Transforma o corpo em luz.|Brilhar;Corpo de luz;Estrela|Queima tudo que toca com luz pura.|=
183|Membros Extras|incomum|5|5|6|bracos_extras|Produz membros adicionais.|Um braço a mais;Quatro braços;Corpo de polvo|Cada braço age sozinho.|=
184|Alongamento|comum|4|6|5|tatuagem_viva|Estende partes do corpo.|Esticar;Agarrar longe;Tentáculo|Alcança qualquer lugar do mapa.|=
185|Divisão Corporal|raro|4|6|7|+|Divide o corpo.|Mão solta;Partes;Enxame de partes|Cada parte luta sozinha.|Uma parte ferida dói no corpo inteiro.
186|Duplicação Corporal|raro|5|5|6|duplicacao|Cria cópias físicas.|Uma cópia;Duas cópias;Exército de um|As cópias duram a batalha toda.|=
187|Fusão Biológica|epico|6|5|7|+|Combina organismos.|Fundir com planta;Fundir com fera;Quimera|Funde-se com um aliado e luta como um só.|Separar machuca os dois.
188|Assimilação|epico|5|6|8|copia|Incorpora características de matéria ou organismos.|Copiar textura;Copiar força;Copiar Dom|Assimila o Dom de quem derrotar.|=
189|Adaptação Evolutiva|raro|5|6|8|+|Desenvolve características específicas em resposta a ameaças.|Resposta;Evolução;Evolução total|Evolui contra o elemento que o feriu.|Evoluir leva tempo; o primeiro golpe dói inteiro.
190|Metamorfose Progressiva|raro|5|5|7|+|Aumenta gradualmente a capacidade transformativa.|Pequena mudança;Mudança maior;Forma final|A cada turno, uma forma mais forte.|Começa fraco; precisa de tempo de luta.
191|Teletransporte|epico|4|7|6|teletransporte|Transporte instantâneo.|Salto curto;Salto longo;Salto em qualquer lugar|Leva quem estiver tocando.|=
192|Teletransporte de Grupo|lendario|3|7|6|+|Transporta várias pessoas.|Levar um;Levar o grupo;Mover o esquadrão|Teleporta o esquadrão para fora do perigo.|Gasta muito; não pode levar ninguém contra a vontade.
193|Portal|lendario|4|7|8|portais|Cria passagens espaciais.|Portal;Portais ligados;Rede de portais|Portais que redirecionam tiros.|=
194|Dobra Espacial|epico|4|7|7|+|Reduz distâncias.|Encurtar;Dobrar;Atalho|Leva aliados de um ponto a outro do mapa.|Dobrar o espaço confunde a mente.
195|Troca Espacial|epico|3|8|6|troca|Troca as posições de dois alvos.|Trocar consigo;Trocar dois;Trocar vários|Troca um inimigo por uma bomba.|=
196|Intangibilidade|epico|3|7|6|intangibilidade|Atravessa matéria.|Mão fantasma;Atravessar;Fantasma|Torna aliados intangíveis.|=
197|Faseamento|epico|5|6|6|+|Altera a interação física.|Desfocar;Fasear;Fora de fase|Ataca de fora de fase.|Faseado, também não acerta golpes físicos.
198|Bolso Dimensional|raro|2|7|8|+|Cria um espaço extradimensional.|Guardar;Esconder;Armazém|Guarda inimigos dentro do bolso.|Espaço limitado.
199|Prisão Espacial|epico|4|7|4|cupula|Confinamento dimensional.|Cela;Cúpula;Prisão|Prende um inimigo fora do tempo.|=
200|Âncora Espacial|raro|3|7|4|+|Impede teletransporte.|Fixar;Ancorar;Âncora total|Ninguém no mapa se teleporta.|Também prende os aliados.
201|Distorção Espacial|epico|4|7|6|distorcao|Distorce o espaço local.|Ondular;Distorcer;Labirinto|O espaço engana os inimigos.|=
202|Compressão Espacial|lendario|6|7|6|espaco|Comprime distância.|Encurtar;Comprimir;Esmagar o espaço|Esmaga inimigos entre dois pontos.|=
203|Expansão Espacial|epico|3|7|6|+|Amplia distância.|Afastar;Expandir;Corredor infinito|O inimigo nunca chega.|O espaço volta ao normal de repente.
204|Passagem Dimensional|lendario|5|6|7|+|Abre caminho para outra dimensão.|Fresta;Passagem;Rasgo|Joga inimigos para outra dimensão por um tempo.|Coisas do outro lado podem atravessar.
205|Isolamento Espacial|epico|3|8|5|abrigo|Separa uma região do espaço externo.|Bolha;Isolar;Zona isolada|Nada entra, nada sai.|=
206|Aceleração Temporal|lendario|5|6|6|aceleracao|Acelera o fluxo temporal de um alvo.|Acelerar;Acelerar aliado;Tempo veloz|Acelera o esquadrão inteiro.|=
207|Desaceleração Temporal|epico|4|6|5|atraso|Reduz o fluxo temporal.|Atrasar;Câmera lenta;Quase parado|O tempo para quem ele toca.|=
208|Parada Temporal|lendario|3|8|5|pausa|Suspende temporariamente uma área.|Parar um;Parar área;Parar o mundo|Age sozinho num mundo parado.|=
209|Percepção Temporal|epico|3|8|5|hipercognicao|Percebe eventos em velocidade alterada.|Ver devagar;Pensar rápido;Tempo próprio|Vê balas paradas no ar.|=
210|Retrocesso|lendario|4|7|6|reversao|Reverte parcialmente um estado recente.|Voltar um objeto;Voltar alguém;Voltar a cena|Volta a batalha alguns segundos.|=
211|Envelhecimento|epico|6|5|4|+|Acelera o envelhecimento.|Murchar;Envelhecer;Pó|Envelhece armas e muros até virarem pó.|Encostar em algo vivo cobra anos do próprio corpo.
212|Rejuvenescimento|epico|2|7|5|+|Reduz a idade biológica.|Rejuvenescer células;Curar o tempo;Renascer|Desfaz qualquer ferimento.|Exagerar tira memórias.
213|Visão do Passado|raro|2|7|5|+|Observa eventos anteriores.|Ver ecos;Ver a cena;Reviver|Vê como o inimigo lutou e sabe o que ele fará.|Sem efeito direto em combate.
214|Premonição|raro|3|7|5|precognicao|Percebe possibilidades futuras.|Pressentir;Ver segundos;Ver caminhos|Escolhe entre dois futuros.|=
215|Loop Temporal|anomalo|5|7|7|+|Repete uma sequência temporal limitada.|Repetir um instante;Repetir um turno;Laço|Repete o próprio turno inteiro.|Cada repetição desgasta o corpo e a mente.
216|Visão Ampliada|comum|3|7|4|olho_de_aguia|Enxerga muito mais longe e melhor.|Ver longe;Mira;Olho de águia|Vê pontos fracos de longe.|=
217|Visão Microscópica|incomum|3|8|4|ponto_fraco|Enxerga o minúsculo.|Ver fissuras;Ver falhas;Ver o ponto exato|Acerta exatamente onde a armadura falha.|=
218|Visão Noturna|comum|2|6|4|infravermelho|Enxerga no escuro.|Penumbra;Escuro;Noite clara|Vê e queima o calor no escuro.|=
219|Visão Térmica|comum|3|6|4|visao_termica|Vê o calor dos corpos.|Ver calor;Através da fumaça;Mapa térmico|Vê quem está escondido.|=
220|Visão Energética|incomum|3|6|5|analise|Vê fluxos de energia e Dons.|Ver Dons;Ver falhas;Ler o inimigo|Vê o Dom inimigo antes de ele ser usado.|=
221|Visão Através de Objetos|incomum|3|7|4|raio_x|Vê através de paredes.|Ver dentro;Ver através;Ver tudo|Atira através de paredes.|=
222|Audição Ampliada|comum|3|6|4|audicao|Ouve muito além do normal.|Ouvir longe;Ouvir passos;Ouvir coração|Sabe onde cada inimigo está pelo som.|=
223|Olfato Ampliado|comum|3|6|4|ecolocalizacao|Fareja longe e com precisão.|Farejar;Seguir rastro;Ler cheiros|Fareja quem está escondido.|=
224|Paladar Analítico|comum|2|7|4|+|Identifica qualquer substância pelo gosto.|Provar;Analisar;Antídoto|Descobre e neutraliza qualquer veneno.|Precisa provar: arriscado.
225|Detecção de Vida|incomum|2|6|4|+|Sente seres vivos em volta.|Sentir vida;Contar;Mapa de vida|Sente civis e inimigos através das paredes.|Não distingue amigo de inimigo à distância.
226|Detecção de Energia|incomum|2|6|4|marcador|Sente fontes de energia.|Sentir;Marcar;Guiar o esquadrão|Marca alvos para todos.|=
227|Detecção de Movimento|comum|2|6|4|radar|Percebe qualquer movimento em volta.|Sentir passos;Radar;Nada escapa|Reage a quem se move perto.|=
228|Percepção de Perigo|comum|3|6|4|+|Um arrepio antes de cada ataque.|Arrepio;Desviar;Instinto|Nunca é pego de surpresa.|Perigo demais o deixa paralisado.
229|Percepção Espacial|incomum|3|7|5|mapa_mental|Entende o espaço em volta de uma olhada.|Mapa;Rotas;Terreno decorado|Conhece cada canto do mapa.|=
230|Rastreamento|comum|3|6|4|+|Segue qualquer rastro.|Pegadas;Rastro;Caçador|O alvo não consegue se esconder dele.|Chuva e água apagam rastros.
231|Previsão de Movimento|raro|4|8|4|+|Prevê para onde o alvo vai.|Ler passos;Prever;Antecipar|Atira onde o alvo vai estar.|Movimentos aleatórios o confundem.
232|Detecção de Poder|incomum|2|7|4|+|Sente e mede Dons.|Sentir Dons;Medir;Expor|Expõe os pontos fracos do Dom inimigo.|Sem efeito contra quem não tem Dom.
233|Detecção Emocional|comum|2|6|4|+|Sente as emoções em volta.|Sentir medo;Sentir raiva;Ler o campo|Sabe quem vai fugir e quem vai atacar.|Emoções demais o atordoam.
234|Detecção Mental|incomum|2|7|4|+|Detecta mentes e pensamentos superficiais.|Sentir mentes;Ler intenções;Rede de mentes|Ouve o plano do inimigo.|Mentes vazias (feras) são difíceis.
235|Sentido Vibracional|incomum|3|6|4|tato_sismico|Sente vibrações pelo chão.|Sentir passos;Ver pelo chão;Sismógrafo|Ninguém que toque o chão se esconde.|=
236|Criação Material|raro|4|6|8|torres|Cria objetos físicos.|Objetos simples;Objetos complexos;Qualquer objeto|Cria o que o esquadrão precisar.|Objetos criados somem depois de um tempo.
237|Criação de Armas|incomum|6|5|6|agulhas|Produz armas.|Faca;Arma de fogo;Arsenal|Arma qualquer aliado na hora.|Armas criadas quebram rápido.
238|Criação de Armadura|incomum|2|6|5|+|Produz proteção.|Placas;Armadura;Armadura de grupo|Armadura que se refaz.|Pesada: deixa mais lento.
239|Criação de Munição|incomum|5|5|5|balas|Produz projéteis.|Balas;Munição especial;Nunca vazio|Balas que fazem curva.|=
240|Criação de Energia|raro|5|5|6|+|Produz energia.|Bateria;Gerador;Usina|Recarrega Dons e técnicas dos aliados.|Precisa de tempo para gerar.
241|Construtos Energéticos|raro|4|6|8|escudos_luz|Cria objetos feitos de energia.|Escudo de luz;Ponte de luz;Fortaleza de luz|Construtos que lutam sozinhos.|=
242|Construtos Psíquicos|raro|5|6|7|+|Cria estruturas mentais.|Mão mental;Arma mental;Fortaleza mental|Construtos que só os inimigos sentem.|Somem se ele for atordoado.
243|Criação Elemental|raro|6|5|7|+|Cria matéria elemental.|Fogo ou gelo;Dois elementos;Todos os elementos|Combina elementos opostos.|Cada elemento cobra seu preço.
244|Criação Vegetal|comum|3|5|6|granadas_bio|Cria plantas.|Brotos;Frutos;Jardim|Frutos que curam ou explodem.|=
245|Criação Mineral|comum|4|5|5|muro_terra|Cria minerais.|Pedra;Muro;Torre de pedra|Ergue fortificações inteiras.|=
246|Criação Cristalina|incomum|5|5|5|+|Cria cristais.|Cristal;Cristais cortantes;Catedral de cristal|Cristais que crescem sozinhos.|Cristais frágeis a golpes pesados.
247|Criação de Clones|raro|5|5|6|clones|Cria duplicatas.|Uma cópia;Várias;Exército|Clones que usam o Dom.|=
248|Invocação Animal|incomum|5|5|6|+|Convoca criaturas.|Um animal;Bando;Matilha alterada|Chama feras alteradas para lutar.|As feras não obedecem para sempre.
249|Invocação Monstruosa|epico|8|3|5|+|Convoca criaturas de combate.|Criatura;Monstro;Horda|Um monstro colossal.|Os monstros atacam qualquer um perto.
250|Criação de Campo|raro|4|6|7|+|Cria áreas com efeitos especiais.|Campo;Campo duplo;Campo vivo|O campo muda de efeito quando ele quiser.|Fora do campo, não tem efeito.
251|Criação de Barreiras|comum|2|6|5|plataformas|Cria estruturas defensivas.|Plataforma;Barreira;Fortaleza|Barreiras em qualquer altura.|=
252|Criação de Armadilhas|incomum|5|6|6|armadilhas_dom|Materializa mecanismos ofensivos.|Armadilha;Campo minado;Rede de armadilhas|Armadilhas invisíveis até para Dons.|=
253|Criação de Ferramentas|comum|3|6|7|ferramentas|Produz objetos utilitários.|Ferramenta;Kit;Oficina|A ferramenta certa a cada turno.|=
254|Criação Biológica|raro|4|6|6|+|Produz organismos simples.|Larvas;Insetos;Enxame|O enxame ataca e cura.|Os organismos morrem rápido.
255|Criação de Servos|raro|5|5|6|bonecos|Produz entidades temporariamente obedientes.|Boneco;Servos;Legião|Servos que explodem.|=
256|Controle Mental|lendario|6|7|6|+|Controla indivíduos à distância.|Ordem;Controle;Marionetes|Controla quem ouvir sua voz.|Mentes fortes resistem; o controle cansa.
257|Controle Animal|incomum|4|6|6|+|Comanda animais.|Acalmar feras;Comandar;Matilha|Comanda as feras alteradas do mapa.|Não funciona em humanos.
258|Controle de Máquinas|incomum|4|7|6|+|Manipula dispositivos eletrônicos.|Ligar;Desligar;Controlar|Toma as torres e drones inimigos.|Sem máquinas, sem Dom.
259|Controle de Tecnologia|raro|4|7|7|+|Interage diretamente com sistemas tecnológicos.|Hackear;Sobrecarregar;Rede viva|Desliga as armas de fogo inimigas.|Sem tecnologia em volta, não serve.
260|Controle de Plantas|comum|4|6|6|+|Manipula vegetação existente.|Raízes;Prender;Mata viva|O mato inteiro do mapa luta.|Sem plantas em volta, fraco.
261|Controle de Insetos|incomum|4|5|6|+|Comanda insetos.|Enxame;Picadas;Nuvem viva|O enxame cobre o mapa.|Fogo e fumaça dispersam o enxame.
262|Controle de Água|incomum|5|6|6|+|Manipula água.|Jato;Muro de água;Maré|Afoga inimigos em pleno chão.|Precisa de água por perto.
263|Controle de Fogo|incomum|6|6|5|+|Manipula chamas existentes.|Desviar fogo;Avivar;Inferno|Todo fogo do mapa é seu.|Precisa de fogo para controlar.
264|Controle de Gelo|incomum|5|6|5|gelo_estrutural|Manipula gelo.|Rampas;Pontes;Fortaleza de gelo|O gelo prende quem pisa.|=
265|Controle de Vento|incomum|5|6|6|laminas_ar|Manipula correntes de ar.|Corte;Rajada;Ciclone|Ventos que cortam como lâminas.|=
266|Controle de Terra|incomum|6|5|6|+|Manipula solo e rochas.|Pedras;Fosso;Avalanche|Abre o chão sob o inimigo.|Concreto e metal resistem.
267|Controle de Metal|raro|6|6|6|vetor|Manipula metais e a direção deles.|Desviar;Arremessar;Redirecionar tudo|Devolve balas para quem atirou.|=
268|Controle de Energia|epico|6|7|7|+|Redireciona energia existente.|Desviar;Redirecionar;Dominar a energia|Devolve técnicas de energia.|Precisa de energia inimiga para agir.
269|Controle de Gravidade|epico|7|6|6|gravidade_zero|Manipula a gravidade.|Leveza;Flutuar;Gravidade zero|Faz inimigos caírem para cima.|=
270|Controle de Som|incomum|5|6|5|+|Manipula ondas sonoras existentes.|Abafar;Amplificar;Eco destrutivo|Usa os tiros inimigos como arma sonora.|Silêncio absoluto o anula.
271|Controle de Luz|incomum|4|6|6|+|Manipula a iluminação.|Apagar;Clarão;Luz e sombra|Deixa o mapa no escuro para o esquadrão.|Escuridão também atrapalha aliados.
272|Controle de Sombra|raro|5|6|6|+|Manipula regiões sombreadas.|Mover sombras;Prender;Mundo de sombras|As sombras seguram os inimigos.|Luz forte desfaz as sombras.
273|Controle de Sangue|epico|7|6|5|hemocinese|Manipula sangue.|Estancar;Puxar;Marionete de sangue|Controla o corpo pelo sangue.|=
274|Controle de Fluidos|incomum|4|6|6|nectar|Manipula líquidos diversos (inclusive curativos).|Néctar;Banho;Fonte|Fluidos que curam e prendem.|=
275|Controle de Gases|incomum|4|6|6|+|Manipula gases ao redor.|Desviar;Concentrar;Bolsão tóxico|Junta o gás inimigo e devolve.|Vento atrapalha.
276|Controle de Fibras|comum|4|6|6|fios|Manipula tecidos e fibras.|Fios;Laço;Teia de cabos|Cabos da cidade viram tentáculos.|=
277|Controle de Partículas|raro|5|7|6|+|Manipula partículas pequenas.|Nuvem;Lâmina de partículas;Desfazer|Desfaz armas no ar.|Exige concentração total.
278|Controle de Temperatura|raro|5|7|6|temperatura|Altera temperatura.|Esquentar;Esfriar;Choque térmico|Choque térmico que racha tudo.|=
279|Controle de Pressão|incomum|6|6|4|+|Altera a pressão física.|Pressionar;Esmagar;Vácuo|Esmaga o inimigo contra o chão.|Pressão demais estoura os próprios ouvidos.
280|Controle de Vibração|incomum|5|6|5|equilibrio|Manipula vibrações.|Tremor;Vibrar;Terremoto local|Faz armas vibrarem até cair das mãos.|Vibra os próprios ossos.
281|Voo|raro|4|6|5|+|Permite voo.|Planar;Voar;Ás do céu|Leva um aliado voando.|Voando, fica sem cobertura.
282|Levitação|incomum|3|6|5|+|Permite flutuar.|Flutuar;Pairar;Levitar alto|Faz aliados flutuarem.|Lento no ar.
283|Supervelocidade|raro|6|5|5|+|Aumenta a velocidade ao extremo.|Rápido;Mais rápido;Borrão|Age antes de qualquer um.|O corpo superaquece.
284|Propulsão|comum|5|5|4|+|Impulsiona o corpo.|Jato;Arrancada;Foguete|Atropela tudo em linha.|Precisa de espaço para parar.
285|Salto Dimensional|raro|4|7|5|+|Deslocamento instantâneo curto.|Piscar;Piscar duplo;Piscar em sequência|Pisca para trás do inimigo e golpeia.|Curto alcance; confunde a mente.
286|Deslizamento|comum|3|6|5|atrito|Reduz o atrito.|Deslizar;Patinar;Chão de gelo|Faz os inimigos escorregarem.|=
287|Escalada Natural|comum|3|6|5|cordas|Adere a superfícies.|Grudar;Subir paredes;Andar no teto|Ataca de cima das paredes.|Superfícies molhadas o fazem cair.
288|Movimento Aquático|comum|3|5|4|+|Aumenta a velocidade na água.|Nadar;Correnteza;Torpedo|Usa a água como estrada.|Fora d'água, nada de especial.
289|Movimento Subterrâneo|raro|5|5|5|+|Desloca-se através do solo.|Cavar;Mergulhar no chão;Toupeira|Emerge debaixo do inimigo.|Concreto e metal o bloqueiam.
290|Movimento Aéreo|raro|4|7|5|+|Muda de direção livremente durante o voo.|Manobra;Acrobacia;Dança aérea|Desvia de tudo no ar.|Precisa estar no ar.
291|Teletransporte Curto|raro|4|6|5|+|Pequenos saltos espaciais.|Saltinho;Saltos;Salto livre|Teleporta-se e ataca na mesma ação.|Alcance curto.
292|Teletransporte Sequencial|epico|5|6|6|+|Realiza múltiplos saltos rápidos.|Dois saltos;Três saltos;Tempestade de saltos|Golpeia de vários lugares ao mesmo tempo.|Cansa muito rápido.
293|Faseamento Móvel|raro|4|6|5|+|Atravessa obstáculos durante o deslocamento.|Passar portas;Passar paredes;Passar tudo|Arrasta inimigos através de paredes.|Faseado não consegue atacar.
294|Dobra de Trajetória|raro|5|7|6|+|Altera o caminho de um objeto ou corpo.|Curvar;Desviar;Ricochete|Faz tiros aliados fazerem curva.|Precisa ver a trajetória.
295|Anulação de Inércia|raro|4|7|5|inercia|Reduz os efeitos da aceleração sobre o corpo.|Parar seco;Mudar direção;Inércia zero|Congela o movimento dos outros.|=
296|Cura|incomum|2|6|5|remedio|Recupera ferimentos.|Curativo;Cura;Cura total|Cura vários de uma vez.|=
297|Cura Acelerada|comum|2|6|4|+|Aumenta a recuperação.|Acelerar cura;Cura rápida;Cura imediata|A cura continua por turnos.|Cura pouco de cada vez.
298|Regeneração Compartilhada|raro|3|6|5|vinculo_dor|Transfere a capacidade regenerativa.|Dividir dor;Dividir cura;Laço vital|O dano que ele recebe vira cura nos aliados.|=
299|Amplificação Física|incomum|3|6|5|+|Aumenta os atributos de aliados.|Reforçar;Fortalecer;Superforça coletiva|Fortalece o esquadrão inteiro.|Ele mesmo não recebe o bônus.
300|Amplificação Energética|raro|3|6|6|+|Aumenta a potência de outros Dons.|Reforçar Dom;Dobrar Dom;Despertar outro|Faz o Dom de um aliado despertar antes.|Amplifica o Strain do aliado também.
301|Transferência de Energia|incomum|2|6|5|+|Passa energia para outro indivíduo.|Doar Stamina;Doar ação;Doar tudo|Dá a vez para um aliado.|Fica sem energia ao doar.
302|Barreira Aliada|incomum|2|7|4|bolhas|Protege companheiros.|Bolha;Escudo de grupo;Bolhas|Prende ou protege com bolhas.|=
303|Purificação|incomum|2|6|5|+|Remove toxinas e efeitos negativos.|Limpar;Purificar;Pureza|Purifica uma área inteira.|Não cura ferimentos.
304|Neutralização|epico|3|7|5|anulacao|Reduz os efeitos de poderes.|Enfraquecer;Neutralizar;Apagar|Apaga Dons em área.|=
305|Resistência Compartilhada|incomum|2|6|5|+|Concede resistência elemental.|Resistir;Proteger;Imunidade de grupo|O esquadrão ignora um elemento.|Só um elemento de cada vez.
306|Comunicação Mental|comum|2|6|5|+|Comunicação telepática com o esquadrão.|Falar;Coordenar;Comando silencioso|Ordens que fazem aliados agirem antes.|Interferência mental corta a ligação.
307|Localização Aliada|comum|2|6|4|+|Detecta companheiros.|Sentir aliados;Achar caídos;Ligação|Sabe quando um aliado vai cair e o protege.|Não detecta inimigos.
308|Compartilhamento Sensorial|incomum|2|6|5|visao_360|Compartilha os sentidos com aliados.|Ver junto;Ver em volta;Visão do grupo|Ninguém do esquadrão é surpreendido.|=
309|Transferência de Memória|incomum|2|7|5|+|Compartilha informações.|Passar o plano;Passar técnica;Mente de grupo|Ensina uma técnica a um aliado durante a luta.|Memórias ruins também passam.
310|Estabilização|comum|2|6|4|+|Impede um aliado ferido de piorar.|Estancar;Estabilizar;Ninguém cai|Estabiliza à distância.|Não cura de verdade.
311|Revitalização|incomum|2|6|4|+|Restaura a energia física.|Fôlego;Revigorar;Segundo fôlego|Devolve a ação a quem já agiu.|Gasta o próprio fôlego.
312|Purificação Mental|incomum|2|7|4|+|Remove efeitos psíquicos.|Clarear;Libertar;Mente limpa|Liberta aliados controlados.|Só funciona em efeitos da mente.
313|Aceleração Metabólica|comum|3|5|4|+|Aumenta a recuperação corporal.|Acelerar;Recuperar;Metabolismo coletivo|Acelera a cura de todos em volta.|Dá muita fome.
314|Campo Regenerativo|raro|3|6|5|+|Cria uma área de recuperação.|Campo;Campo forte;Santuário|O campo também protege.|Precisa ficar dentro do campo.
315|Campo de Resistência|incomum|2|6|4|+|Reduz determinado tipo de dano.|Campo;Campo reforçado;Bastião|O campo para um tipo de dano por completo.|Só um tipo de dano por vez.
316|Manipulação da Realidade|anomalo|8|6|10|+|Altera propriedades locais da realidade.|Pequenas mudanças;Regras locais;Reescrever|Reescreve uma regra da batalha.|Cada mudança cobra caro do corpo e da mente.
317|Alteração de Probabilidade|anomalo|4|7|8|probabilidade|Modifica a chance de acontecimentos.|Sorte;Azar;Probabilidade|Garante um acerto crítico.|=
318|Manipulação do Destino|anomalo|5|7|8|sorte|Influencia sequências de eventos futuros.|Empurrar o destino;Escolher;Destino selado|Escolhe o resultado de um golpe.|=
319|Controle Temporal|anomalo|6|7|8|+|Manipula o fluxo temporal.|Acelerar e atrasar;Parar;Senhor do tempo|Volta, para e acelera o tempo à vontade.|O tempo cobra: envelhece um pouco a cada uso.
320|Manipulação Dimensional|anomalo|6|7|8|+|Cria ou altera conexões entre dimensões.|Frestas;Pontes;Dimensões|Funde duas dimensões no campo.|Coisas do outro lado vêm junto.
321|Manipulação Molecular|anomalo|8|8|9|+|Reconstrói matéria em escala molecular.|Mexer na matéria;Reconstruir;Recriar|Transforma qualquer coisa em qualquer coisa.|Concentração absoluta; um erro desfaz tudo.
322|Negação de Poder|anomalo|4|8|5|+|Interrompe temporariamente Dons.|Apagar um;Apagar área;Mundo sem Dons|Ninguém usa Dom perto dele.|Também apaga os Dons aliados.
323|Cópia de Poder|anomalo|6|6|9|espelho_dom|Reproduz temporariamente outro Dom.|Copiar;Devolver;Arsenal de Dons|Usa o Dom copiado melhor que o dono.|=
324|Transferência de Poder|anomalo|4|7|7|+|Transfere uma capacidade para outra pessoa.|Emprestar;Trocar;Doar|Dá o próprio Dom a um aliado por uma batalha.|Sem o Dom, fica vulnerável.
325|Combinação de Poderes|anomalo|7|6|9|+|Funde dois ou mais Dons.|Somar;Fundir;Dom novo|Funde o Dom de dois aliados num golpe.|Precisa de aliados com Dom por perto.
326|Evolução Adaptativa|anomalo|6|6|9|+|Desenvolve uma resposta completamente nova diante de uma ameaça.|Resposta;Evolução;Nova espécie|Ganha uma técnica nova no meio da luta.|Imprevisível: nem ele sabe o que virá.
327|Absorção Universal|anomalo|6|6|8|+|Absorve diferentes formas de energia.|Absorver;Absorver tudo;Buraco negro|Absorve a técnica e devolve.|Cheio demais, explode.
328|Conversão Universal|anomalo|6|7|9|inversao|Converte uma forma de energia em outra.|Converter;Inverter;Tudo em tudo|Dano vira cura e cura vira dano.|=
329|Manipulação da Vida|anomalo|6|7|8|+|Altera processos biológicos fundamentais.|Curar;Mudar;Criar e tirar vida|Devolve a vida a um aliado caído.|Cada uso cobra vida do próprio corpo.
330|Manipulação da Morte|anomalo|8|6|6|+|Interfere nos limites entre vida e morte.|Toque frio;Ceifar;Limiar|Ninguém morre perto dele — nem os inimigos.|Usar o Dom aproxima a própria morte.
331|Criação de Vida|anomalo|5|6|9|+|Cria organismos complexos.|Sementes;Criaturas;Ecossistema|Cria um aliado vivo para lutar.|A vida criada tem vontade própria.
332|Consciência Coletiva|anomalo|4|8|8|+|Conecta múltiplas mentes permanentemente.|Ligar;Rede;Uma mente|Todo o esquadrão pensa como um.|Se um cai, todos sentem.
333|Controle de Massa|anomalo|9|5|7|+|Manipula grandes quantidades de matéria simultaneamente.|Mover muito;Mover tudo;Mover a cidade|Arremessa um quarteirão.|O esforço pode matar.
334|Controle Gravitacional Extremo|anomalo|10|5|6|+|Produz campos gravitacionais de grande escala.|Campo forte;Poço;Singularidade|Abre uma singularidade que puxa tudo.|A singularidade não escolhe lado.
335|Controle Espacial Extremo|anomalo|7|7|8|+|Distorce regiões significativas do espaço.|Dobrar;Cortar;Reescrever o espaço|Corta o espaço: tudo em linha some.|Distorcer tanto espaço confunde a própria mente.
"""
