"""
Mecânica dos Dons NOVOS do catálogo central (os que não vieram de um Dom anterior).

MECH[id] = 'termo|elemento|estado|zona|sobrecarga|despertar|I|M|S|C'  ('-' = nenhum, vazio = padrão)
SIG[id]  = (passiva inata, técnica-assinatura) — cada Dom é único.

Usado por tools/gen_catalog.py. Vocabulário de efeitos: o mesmo de gen_signatures.py (validado
por tests/game/gift_signatures.test.ts).
"""
from gen_signatures import inn, sig, st

MECH = {}
SIG = {}


def g(gid, mech, innate, signature):
    assert gid not in MECH, gid
    MECH[gid] = mech
    SIG[gid] = (innate, signature)


# ───────────────────────────── I. Físicos ─────────────────────────────
g('reflexos_aprimorados', 'Reflexo|-|-|-|confusao|visao|soco|deslize|inspirar|prender',
  inn('Reação rápida: 30% de chance de desviar de tiros.', react={'on': 'ranged', 'do': 'dodge', 'chance': 30}),
  sig('Contra-Reflexo', 'Fica em guarda: preparado para reagir e com escudo de 15% da vida.', 'buff', 'self', rng=0, pw=0, mp=7, cd=3, st=25, fx={'self': st('preparado', 2), 'shield': 0.15}, anim='buff'))
g('corpo_cristalino', 'Cristal|luz|-|-|trava|couraca|soco|deslize|escudo|prender',
  inn('Corpo de cristal: 40% de chance de refletir raios e técnicas de energia.', react={'on': 'magic', 'do': 'reflect', 'chance': 40}),
  sig('Estilhaçar', 'Explode lascas do próprio corpo em volta: cortes que sangram.', 'physical', 'self', 'radius', 0, 10, radius=1, status=('sangramento', 2), fx={'pierce': 0.3}, anim='nova'))
g('corpo_gasoso', 'Gás|-|cegado|gas|desfaz|mobilidade|onda|fase|inspirar|zona',
  inn('Meio gasoso: 20% menos dano físico e atravessa inimigos ao andar.', reduce={'physical': 0.2}, noOpportunity=True),
  sig('Envolver', 'Vira nuvem em volta do alvo: sufoca e cega.', 'magic', rng=4, pw=7, status=('cegado', 2), fx={'leap': True, 'cloud': 'gas_fetido'}, anim='smoke'))
g('corpo_liquido', 'Água|agua|molhado|agua|desfaz|mobilidade|onda|deslize|cura|puxao',
  inn('Corpo líquido: golpes físicos escorrem (25% menos dano).', reduce={'physical': 0.25}),
  sig('Afogar', 'Entra no corpo do alvo e o afoga por dentro: dano contínuo.', 'magic', rng=1, pw=9, el='agua', status=('submerso', 2), fx={'pierce': 0.6}, anim='claw'))
g('corpo_energetico', 'Energia|eletricidade|eletrocutado|-|choque|furia|rajada|propulsao|inspirar|zona',
  inn('Meio energia: imune a eletricidade e técnicas de energia custam menos.', immune=['eletrocutado'], mpDiscount={'pct': 0.2}),
  sig('Corpo em Raio', 'Vira energia e atravessa a linha: todos no caminho são eletrocutados.', 'physical', 'tile', 'line', 6, 11, el='eletricidade', status=('eletrocutado', 2), fx={'dashThrough': True}, anim='dash'))
g('regeneracao_avancada', 'Regeneração|-|-|-|fome|imortal|soco|deslize|cura|prender',
  inn('Regenera 4% por turno e volta de um golpe fatal uma vez por batalha.', regen=0.04, cheatDeath=True),
  sig('Refazer o Corpo', 'Refaz o corpo: cura 60% e remove todos os efeitos negativos.', 'heal', 'self', rng=0, pw=0, mp=10, cd=5, st=40, fx={'healPct': 0.6, 'cleanse': True}, anim='heal'))
g('adaptacao_biologica', 'Adaptação|-|-|-|fome|couraca|soco|deslize|purificar|prender',
  inn('Imune a veneno e sangramento.', immune=['envenenado', 'sangramento']),
  sig('Mutação Defensiva', 'Muta a pele: 30% menos dano de tudo por 3 turnos.', 'buff', 'self', rng=0, pw=0, mp=8, cd=4, st=30, fx={'self': st('fortificado', 3), 'shield': 0.15}, anim='buff'))
g('adaptacao_aquatica', 'Maré|agua|molhado|agua|exaustao|mobilidade|soco|deslize|cura|puxao',
  inn('Respira na água: +2 de deslocamento em água e +20% de dano contra alvos molhados.', moveBonus=1, vs={'status': 'molhado', 'mult': 1.2}),
  sig('Arrasto ao Fundo', 'Agarra e arrasta o alvo: puxa 3 casas e o deixa submerso.', 'physical', rng=4, pw=9, el='agua', status=('submerso', 1), fx={'pull': 3}, anim='claw'))
g('longevidade', 'Vitalidade|-|-|-|envelhecer|imortal|soco|deslize|cura|prender',
  inn('Células jovens: regenera 3% por turno e não sangra até a morte tão rápido.', regen=0.03, ignoreOnce='sangramento'),
  sig('Juventude', 'Rejuvenesce o corpo: cura 35% e ganha uma ação extra.', 'heal', 'self', rng=0, pw=0, mp=10, cd=5, st=40, fx={'healPct': 0.35, 'extraTurn': True}, anim='heal'))
g('imunidade_ampliada', 'Imunidade|veneno|-|-|fome|guardiao|soco|deslize|purificar|prender',
  inn('Imune a veneno, gás e doenças do campo.', immune=['envenenado', 'enfraquecido']),
  sig('Sangue Antídoto', 'Toca aliados ao lado: limpa venenos e efeitos negativos e cura um pouco.', 'heal', 'self', 'radius', 0, 0, radius=1, mp=7, cd=3, st=25, fx={'cleanse': True, 'healPct': 0.15}, anim='heal'))
g('absorcao_de_impacto', 'Impacto|-|derrubado|-|trava|couraca|soco|deslize|escudo|empurrao',
  inn('Amortece: 25% menos dano corpo a corpo e não é derrubado.', reduce={'melee': 0.25}, immune=['derrubado']),
  sig('Devolver o Impacto', 'Solta todo o impacto guardado: dano maior quanto mais vida perdeu.', 'physical', rng=1, pw=12, mp=9, cd=3, st=35, fx={'knock': 3, 'shieldFromLost': 0.3}, anim='charge'))
g('descarga_cinetica', 'Cinética|-|derrubado|-|exaustao|furia|onda|propulsao|inspirar|empurrao',
  inn('Cada casa andada no turno dá +4% de dano ao próximo golpe.', ram=0.04),
  sig('Descarga em Linha', 'Corre e descarrega: atravessa a linha derrubando todos.', 'physical', 'tile', 'line', 6, 10, status=('derrubado', 1), fx={'dashThrough': True, 'ram': 0.1}, anim='dash'))
g('forma_monstruosa', 'Monstro|sombra|medo|-|descontrole|furia|soco|salto|escudo|empurrao',
  inn('Monstruoso: +25% de dano físico e quem o ataca de perto fica com medo às vezes.', physBoost=0.25, react={'on': 'melee', 'do': 'status', 'chance': 20, 'status': st('medo', 1)}),
  sig('Fúria do Monstro', 'Golpeia todos em volta com força bruta e solta um rugido aterrador.', 'physical', 'self', 'radius', 0, 13, radius=1, status=('medo', 1), fx={'knock': 1, 'demolish': 2}, anim='nova'))

# ───────────────────────────── II. Energia ─────────────────────────────
g('projecao_energetica', 'Energia|luz|-|-|exaustao|furia|rajada|propulsao|inspirar|empurrao',
  inn('Rajadas de energia: ataque básico à distância (alcance 5).', reachBonus=4),
  sig('Rajada em Curva', 'Dispara uma rajada que faz curva atrás da cobertura.', 'magic', rng=7, pw=11, el='luz', fx={'homing': True}, anim='beam'))
g('canhao_energetico', 'Canhão|luz|-|-|exaustao|furia|rajada|propulsao|escudo|empurrao',
  inn('Concentra energia: +25% de dano mágico se não se moveu no turno.', steadyAim=0.25),
  sig('Canhão Total', 'Um feixe enorme que atravessa a linha inteira e derruba paredes.', 'magic', 'tile', 'line', 9, 15, el='luz', fx={'through': True, 'demolish': 3}, mp=12, cd=4, st=50, anim='beam'))
g('absorcao_energetica', 'Absorção|eletricidade|-|-|choque|couraca|rajada|deslize|escudo|zona',
  inn('Absorve energia: técnicas elétricas e de luz o curam em vez de ferir.', absorb=['eletricidade', 'luz']),
  sig('Devolver em Dobro', 'Solta tudo o que absorveu num raio que salta entre 3 inimigos.', 'magic', rng=6, pw=10, el='eletricidade', fx={'chain': 3, 'chainMult': 0.8}, anim='bolt'))
g('conversao_energetica', 'Conversão|luz|-|-|confusao|visao|rajada|propulsao|cura|zona',
  inn('Converte: 20% do dano mágico recebido vira Stamina.', react={'on': 'magic', 'do': 'mitigate', 'reduce': 0.2}),
  sig('Golpe em Cura', 'Converte a energia em volta: cura aliados próximos e fere inimigos próximos.', 'magic', 'self', 'radius', 0, 7, radius=2, el='luz', fx={'spareAllies': True, 'healPct': 0.2}, anim='nova'))
g('descarga_energetica', 'Descarga|eletricidade|eletrocutado|-|choque|furia|rajada|propulsao|inspirar|zona',
  inn('A cada 3 técnicas, a próxima descarrega em volta.', chargeEvery={'n': 3, 'power': 7, 'radius': 1}),
  sig('Arco de Descarga', 'Descarrega tudo: o raio salta de alvo em alvo até 4 vezes.', 'magic', rng=6, pw=9, el='eletricidade', status=('eletrocutado', 1), fx={'chain': 4, 'chainMult': 0.75}, anim='bolt'))
g('campo_energetico', 'Campo|eletricidade|lento|-|choque|guardiao|area|propulsao|escudo|zona',
  inn('Campo próprio: inimigos que chegam ao lado ficam lentos.', aura={'radius': 1, 'status': st('lento', 1)}),
  sig('Campo Carregado', 'Carrega uma área: quem estiver nela leva choque e fica lento.', 'magic', 'tile', 'radius', 6, 8, radius=2, el='eletricidade', status=('lento', 2), fx={'surface': 'agua_eletrica'}, anim='nova'))
g('esfera_energetica', 'Esfera|luz|-|-|exaustao|furia|projetil|propulsao|inspirar|prender',
  inn('Esferas em órbita: +10% de crítico em técnicas à distância.', critBonus=10),
  sig('Chuva de Esferas', 'Dispara esferas em 4 alvos aleatórios em volta.', 'magic', 'tile', 'radius', 7, 7, radius=2, el='luz', fx={'randomTargets': 4}, anim='volley'))
g('absorcao_radioativa', 'Brilho|veneno|enfraquecido|-|queimadura|imortal|rajada|deslize|cura|zona',
  inn('Reator vivo: regenera 4% por turno e é imune a enfraquecer.', regen=0.04, immune=['enfraquecido']),
  sig('Pulso do Reator', 'Libera a radiação guardada: enfraquece todos em volta.', 'magic', 'self', 'radius', 0, 8, radius=2, el='veneno', status=('enfraquecido', 2), anim='nova'))
g('energia_solar', 'Sol|luz|cegado|-|exaustao|guardiao|rajada|propulsao|cura|prender',
  inn('Painel vivo: recupera Stamina a cada turno.', mpRegen=2),
  sig('Sol Guardado', 'Concentra o sol guardado num raio que cega e queima.', 'magic', 'tile', 'line', 8, 11, el='luz', status=('cegado', 1), fx={'through': True}, anim='beam'))
g('energia_cosmica', 'Cosmos|luz|-|-|desmaio|dominio|rajada|fase|inspirar|zona',
  inn('Energia cósmica: +20% de dano de técnicas e enxerga escondidos.', magicBoost=0.2, seeHidden=True),
  sig('Rasgo Cósmico', 'Abre um rasgo de energia que apaga tudo em linha, ignorando defesa.', 'magic', 'tile', 'line', 10, 16, el='luz', fx={'through': True, 'pierce': 1, 'destroyProps': True}, mp=14, cd=5, st=60, anim='beam'))
g('energia_vital', 'Vida|-|-|-|desmaio|imortal|rajada|deslize|cura|prender',
  inn('Golpes roubam 15% do dano como vida.', lifesteal=0.15),
  sig('Doar a Vida', 'Doa 25% da própria vida a um aliado: cura o dobro disso e o levanta se caído.', 'heal', 'ally', rng=5, pw=0, mp=8, cd=4, st=30, fx={'healPct': 0.5}, anim='heal'))
g('conversao_de_calor', 'Calor|fogo|queimando|fogo|queimadura|mobilidade|rajada|propulsao|inspirar|zona',
  inn('Imune a queimaduras: o fogo o deixa veloz.', immune=['queimando'], absorb=['fogo']),
  sig('Motor Térmico', 'Converte o calor em ação: ganha uma ação extra e fica veloz.', 'buff', 'self', rng=0, pw=0, mp=9, cd=5, st=40, fx={'extraTurn': True, 'self': st('veloz', 2)}, anim='buff'))
g('explosao_sonica', 'Estrondo|vento|atordoado|-|confusao|furia|onda|propulsao|inspirar|empurrao',
  inn('Imune a atordoar por som; golpes em área têm +15% de dano.', immune=['atordoado'], magicBoost=0.15),
  sig('Bomba Sônica', 'Estrondo que quebra vidro e osso: atordoa e destrói cobertura em volta.', 'magic', 'tile', 'radius', 6, 11, radius=2, el='vento', status=('atordoado', 1), fx={'destroyProps': True}, anim='nova'))
g('absorcao_sonora', 'Silêncio|-|silenciado|-|confusao|guardiao|preciso|deslize|escudo|zona',
  inn('Silêncio em volta: quem o ataca de perto fica silenciado às vezes.', react={'on': 'melee', 'do': 'status', 'chance': 25, 'status': st('silenciado', 1)}),
  sig('Bolha de Silêncio', 'Uma bolha onde ninguém usa Dom nem técnica por 2 turnos.', 'magic', 'tile', 'radius', 6, 0, radius=2, status=('silenciado', 2), fx={'noDamage': True}, anim='nova'))
g('frequencia_destrutiva', 'Frequência|vento|quebrado|-|confusao|furia|onda|propulsao|inspirar|zona',
  inn('Golpes destroem cobertura com o dobro de dano.', demolish=2),
  sig('Frequência de Ruptura', 'Um zumbido que racha armaduras e derruba coberturas em cone.', 'magic', 'tile', 'cone', 5, 10, el='vento', status=('quebrado', 2), fx={'destroyProps': True, 'pierce': 0.4}, anim='cone'))

# ───────────────────────────── III. Elementais ─────────────────────────────
g('madeira', 'Madeira|terra|preso|parede|trava|guardiao|projetil|salto|escudo|prender',
  inn('Casca de madeira: 15% menos dano físico, mas o fogo dói mais.', reduce={'physical': 0.15}),
  sig('Árvore Viva', 'Ergue um tronco que serve de cobertura e cura quem se apoia nele.', 'utility', 'tile', 'single', 5, 0, mp=8, cd=4, st=30, fx={'build': {'shape': 'pillar', 'height': 3, 'turns': 4}, 'healPct': 0.15}, anim='summon'))
g('tempestade', 'Tempestade|eletricidade|eletrocutado|agua|choque|dominio|onda|propulsao|inspirar|zona',
  inn('Olho da tempestade: imune a molhado e eletricidade.', immune=['molhado', 'eletrocutado']),
  sig('Tempestade', 'Chuva elétrica numa área enorme: molha, eletrocuta e empurra.', 'magic', 'tile', 'radius', 8, 11, radius=3, el='eletricidade', status=('eletrocutado', 1), fx={'surface': 'agua_eletrica', 'vortex': 1}, mp=13, cd=5, st=55, anim='meteor'))
g('frio', 'Frio|gelo|lento|gelo|congelamento|couraca|rajada|deslize|escudo|zona',
  inn('Aura de frio: inimigos ao lado ficam lentos.', aura={'radius': 1, 'status': st('lento', 1)}),
  sig('Zero Absoluto', 'Tira todo o calor de uma área: congela quem está nela.', 'magic', 'tile', 'radius', 5, 8, radius=1, el='gelo', status=('congelado', 1), fx={'surface': 'geada'}, anim='nova'))

# ───────────────────────────── IV. Psíquicos ─────────────────────────────
g('controle_mental', 'Mente|-|encantado|-|confusao|dominio|preciso|deslize|inspirar|prender',
  inn('Mente forte: imune a confusão e encanto.', immune=['confuso', 'encantado']),
  sig('Marionete', 'Toma o controle de um inimigo: ele luta do seu lado por 2 turnos.', 'magic', rng=5, pw=0, status=('encantado', 2), fx={'noDamage': True}, mp=12, cd=5, st=55, anim='orb'))
g('bloqueio_mental', 'Bloqueio|-|silenciado|-|confusao|guardiao|preciso|deslize|escudo|prender',
  inn('Mente fechada: imune a silêncio.', immune=['silenciado']),
  sig('Trava Mental', 'Bloqueia o Dom do alvo: silenciado e sem Stamina para técnicas.', 'magic', rng=6, pw=0, status=('silenciado', 3), fx={'noDamage': True, 'maxMpCut': 0.3}, anim='orb'))
g('confusao_mental', 'Confusão|-|confuso|-|confusao|visao|preciso|deslize|inspirar|prender',
  inn('Mente caótica: quem o ataca de perto fica confuso às vezes.', react={'on': 'melee', 'do': 'status', 'chance': 25, 'status': st('confuso', 1)}),
  sig('Caos Mental', 'Confunde todos numa área: atacam quem estiver perto.', 'magic', 'tile', 'radius', 6, 0, radius=2, status=('confuso', 2), fx={'noDamage': True}, anim='nova'))
g('paralisia_psiquica', 'Paralisia|-|imobilizado|-|confusao|dominio|preciso|deslize|inspirar|prender',
  inn('Olhar que trava: inimigos que o atacam ficam imobilizados às vezes.', react={'on': 'any', 'do': 'status', 'chance': 20, 'status': st('imobilizado', 1)}),
  sig('Paralisia em Área', 'Paralisa todos numa área por 1 turno.', 'magic', 'tile', 'radius', 6, 0, radius=1, status=('atordoado', 1), fx={'noDamage': True}, mp=11, cd=4, st=45, anim='nova'))
g('manipulacao_emocional', 'Emoção|-|medo|-|confusao|guardiao|preciso|deslize|inspirar|prender',
  inn('Coração firme: aliados ao lado ficam inspirados.', aura={'radius': 1, 'allies': True, 'status': st('inspirado', 1)}),
  sig('Inverter o Medo', 'Aliados em volta perdem o medo e ganham coragem; inimigos em volta ficam com medo.', 'magic', 'self', 'radius', 0, 0, radius=2, status=('medo', 2), fx={'noDamage': True, 'aura': {'radius': 2, 'allies': True, 'status': st('inspirado', 2)}}, anim='shout'))
g('inducao_de_medo', 'Medo|sombra|medo|-|confusao|dominio|preciso|deslize|inspirar|prender',
  inn('Presença aterradora: quem o ataca de perto fica com medo às vezes.', react={'on': 'melee', 'do': 'status', 'chance': 25, 'status': st('medo', 1)}),
  sig('Terror', 'Pânico contagioso: o alvo e quem estiver perto fogem com medo.', 'magic', 'tile', 'radius', 6, 0, radius=1, status=('medo', 2), fx={'noDamage': True}, anim='shout'))
g('inducao_de_furia', 'Fúria|fogo|provocado|-|descontrole|furia|soco|deslize|inspirar|prender',
  inn('Fúria contagiante: +20% de dano com menos da metade da vida.', fury=1.2),
  sig('Fúria Cega', 'O alvo fica cego de fúria e ataca os próprios aliados.', 'magic', rng=6, pw=0, status=('confuso', 2), fx={'noDamage': True, 'also': [st('frenesi', 2)]}, anim='orb'))
g('calmaria_mental', 'Calma|-|sono|-|desmaio|guardiao|preciso|deslize|purificar|prender',
  inn('Serenidade: imune a medo e fúria.', immune=['medo', 'provocado']),
  sig('Paz', 'Acalma uma área: inimigos dormem e aliados se livram de efeitos negativos.', 'magic', 'tile', 'radius', 6, 0, radius=2, status=('sono', 2), fx={'noDamage': True, 'cleanse': True}, anim='nova'))
g('ataque_psiquico', 'Mente|sombra|atordoado|-|confusao|furia|preciso|deslize|inspirar|prender',
  inn('Golpes mentais ignoram 40% da armadura.', pierce=0.4),
  sig('Explosão Mental', 'Dano direto na mente: ignora toda a armadura e atordoa.', 'magic', rng=7, pw=13, el='sombra', status=('atordoado', 1), fx={'pierce': 1}, anim='orb'))
g('defesa_psiquica', 'Fortaleza|-|-|-|desmaio|guardiao|preciso|deslize|escudo|prender',
  inn('Mente blindada: imune a confusão, encanto, medo e sono.', immune=['confuso', 'encantado', 'medo', 'sono']),
  sig('Fortaleza Mental', 'Protege os aliados em volta: imunes a controle mental por 3 turnos.', 'buff', 'self', 'radius', 0, 0, radius=2, mp=8, cd=4, st=30, fx={'aura': {'radius': 2, 'allies': True, 'status': st('inabalavel', 3)}}, anim='buff'))
g('projecao_astral', 'Espírito|sombra|-|-|desmaio|visao|preciso|fase|inspirar|prender',
  inn('Sai do corpo para olhar: enxerga escondidos e o mapa todo.', seeHidden=True, noSurprise=True),
  sig('Ataque Astral', 'O espírito atravessa paredes e golpeia o alvo onde ele estiver.', 'magic', rng=10, pw=11, el='sombra', fx={'through': True, 'pierce': 0.5}, anim='blink'))
g('compartilhamento_sensorial', 'Sentidos|-|marcado|-|confusao|visao|preciso|deslize|inspirar|prender',
  inn('Sentidos ligados: aliados não são pegos de surpresa.', noSurprise=True),
  sig('Olhos de Todos', 'Liga os sentidos do esquadrão: revela todos e marca o alvo.', 'utility', 'self', rng=0, pw=0, mp=6, cd=4, st=20, fx={'reveal': True}, status=('marcado', 2), anim='nova'))
g('memoria_compartilhada', 'Memória|-|-|-|confusao|visao|preciso|deslize|inspirar|prender',
  inn('Lembra por todos: técnicas custam 15% menos.', mpDiscount={'pct': 0.15}),
  sig('Ensinar na Luta', 'Passa o plano a um aliado: as recargas dele diminuem e ele age mais cedo.', 'buff', 'ally', rng=6, pw=0, mp=7, cd=4, st=25, fx={'reduceCooldowns': 2, 'gaugeShift': True}, anim='buff'))
g('presenca_psiquica', 'Presença|-|provocado|-|confusao|guardiao|preciso|deslize|escudo|prender',
  inn('Presença: inimigos ao lado são provocados a atacá-lo.', aura={'radius': 1, 'status': st('provocado', 1)}),
  sig('Domínio do Ambiente', 'Ninguém consegue tirar os olhos dele: provoca todos em volta e fica protegido.', 'buff', 'self', 'radius', 0, 0, radius=3, mp=8, cd=4, st=30, status=('provocado', 2), fx={'shield': 0.25}, anim='shout'))
g('dominacao_psiquica', 'Dominação|sombra|encantado|-|confusao|dominio|preciso|deslize|inspirar|prender',
  inn('Vontade de ferro: imune a encanto e confusão.', immune=['encantado', 'confuso']),
  sig('Exército de Mentes', 'Domina até 2 inimigos numa área: lutam do lado dele.', 'magic', 'tile', 'radius', 6, 0, radius=1, status=('encantado', 2), fx={'noDamage': True}, mp=14, cd=6, st=60, anim='nova'))
g('projecao_mental', 'Lança Mental|-|-|-|confusao|furia|projetil|deslize|escudo|prender',
  inn('Construções mentais: +10% de dano e crítico em técnicas.', magicBoost=0.1, critBonus=5),
  sig('Lança Mental', 'Uma lança de pensamento atravessa a linha e derruba.', 'magic', 'tile', 'line', 7, 11, status=('derrubado', 1), fx={'through': True}, anim='beam'))
g('escudo_mental', 'Escudo|-|-|-|desmaio|guardiao|preciso|deslize|escudo|prender',
  inn('Escudo mental: aliados ao lado não podem ser controlados.', aura={'radius': 1, 'allies': True, 'status': st('inabalavel', 1)}),
  sig('Bolha Mental', 'Escudo de 25% da vida em todos os aliados em volta.', 'buff', 'self', 'radius', 0, 0, radius=2, mp=9, cd=4, st=35, fx={'allyShield': 0.25}, anim='buff'))
g('anulacao_psiquica', 'Anulação|-|silenciado|-|desmaio|dominio|preciso|deslize|escudo|prender',
  inn('Zona morta: quem o ataca de perto fica silenciado às vezes.', react={'on': 'melee', 'do': 'status', 'chance': 30, 'status': st('silenciado', 1)}),
  sig('Zona Morta', 'Anula Dons mentais em volta: silencia e tira reforços de todos.', 'magic', 'self', 'radius', 0, 0, radius=2, status=('silenciado', 2), fx={'noDamage': True, 'dispel': True}, anim='nova'))

# ───────────────────────────── V. Matéria ─────────────────────────────
g('telecinese', 'Telecinese|-|derrubado|-|desmaio|dominio|projetil|propulsao|escudo|puxao',
  inn('Move objetos: arremessa caixas e barris com mais força.', shoveBonus=2),
  sig('Levitar e Arremessar', 'Ergue o alvo e o joga contra o chão: derruba e arremessa 3 casas.', 'magic', rng=6, pw=11, status=('derrubado', 1), fx={'knock': 3}, anim='orb'))
g('telecinese_macica', 'Telecinese|terra|derrubado|-|desmaio|dominio|area|propulsao|escudo|empurrao',
  inn('Mente enorme: técnicas derrubam paredes com o triplo de força.', demolish=3),
  sig('Arremessar Escombros', 'Ergue toneladas de escombros e joga numa área: dano pesado e derruba.', 'magic', 'tile', 'radius', 7, 14, radius=2, el='terra', status=('derrubado', 1), fx={'destroyProps': True}, mp=13, cd=5, st=55, anim='meteor'))
g('expansao', 'Expansão|-|derrubado|-|exaustao|furia|area|propulsao|escudo|empurrao',
  inn('Faz coisas crescerem: golpes empurram 1 casa a mais.', shoveBonus=1),
  sig('Inchar', 'Expande a arma do alvo até explodir: desarma e fere.', 'magic', rng=6, pw=9, status=('desarmado', 2), fx={'breakItem': True}, anim='orb'))
g('transmutacao', 'Transmutação|terra|quebrado|-|desfaz|dominio|area|deslize|purificar|prender',
  inn('Transmuta: ignora 30% da armadura.', pierce=0.3),
  sig('Pedra em Barro', 'Transmuta a armadura do alvo: fica quebrado e lento.', 'magic', rng=1, pw=10, el='terra', status=('quebrado', 3), fx={'also': [st('lento', 2)]}, anim='claw'))
g('reestruturacao', 'Reestruturação|terra|-|parede|desfaz|guardiao|area|deslize|escudo|prender',
  inn('Reconstrói: aliados ao lado regeneram 3% por turno.', aura={'radius': 1, 'allies': True, 'status': st('regenerando', 1)}),
  sig('Erguer de Novo', 'Reconstrói um muro destruído ou cria cobertura nova.', 'utility', 'tile', 'single', 5, 0, mp=6, cd=3, st=25, fx={'build': {'shape': 'wall', 'height': 2, 'turns': 4}}, anim='summon'))
g('petrificacao', 'Pedra|terra|imobilizado|-|trava|couraca|preciso|deslize|escudo|prender',
  inn('Olhar de pedra: quem o ataca de perto fica lento às vezes.', react={'on': 'melee', 'do': 'status', 'chance': 30, 'status': st('lento', 2)}),
  sig('Estátua de Pedra', 'Petrifica o alvo: imobilizado e quebrado por 2 turnos.', 'magic', rng=5, pw=6, el='terra', status=('imobilizado', 2), fx={'also': [st('quebrado', 2)]}, anim='orb'))
g('manipulacao_de_madeira', 'Madeira|terra|preso|-|exaustao|guardiao|projetil|salto|escudo|prender',
  inn('Madeira obedece: imune a ser preso.', immune=['preso']),
  sig('Lanças de Madeira', 'Lanças de madeira saem do chão numa linha.', 'physical', 'tile', 'line', 6, 10, status=('preso', 1), fx={'through': True}, anim='thrust'))
g('manipulacao_de_poeira', 'Poeira|terra|cegado|fumaca|cegueira|visao|onda|deslize|inspirar|zona',
  inn('Poeira em volta: +10 de esquiva.', evasion=10),
  sig('Tempestade de Poeira', 'Poeira nos olhos e nas armas: cega e desarma numa área.', 'magic', 'tile', 'radius', 6, 5, radius=2, el='terra', status=('cegado', 2), fx={'cloud': 'fumaca', 'also': [st('desarmado', 1)]}, anim='smoke'))
g('controle_de_cristal', 'Cristal|luz|-|-|exaustao|couraca|projetil|deslize|escudo|prender',
  inn('Cristais obedecem: +15% de dano perto de cristais e fragmentos do Cubo.', physBoost=0.1, magicBoost=0.1),
  sig('Lanças de Cristal', 'Lanças de cristal em cone que atravessam armaduras.', 'magic', 'tile', 'cone', 5, 10, el='luz', fx={'pierce': 0.5}, anim='cone'))
g('controle_de_plastico', 'Plástico|fogo|preso|-|queimadura|guardiao|projetil|deslize|escudo|prender',
  inn('Envolve: golpes têm 20% de chance de prender.', onCastSelf={'status': st('afiado', 1)}),
  sig('Plástico Derretido', 'Envolve o alvo em plástico quente: preso e queimando.', 'magic', rng=5, pw=8, el='fogo', status=('preso', 2), fx={'also': [st('queimando', 2)]}, anim='orb'))
g('controle_de_borracha', 'Borracha|-|derrubado|-|exaustao|mobilidade|soco|salto|escudo|empurrao',
  inn('Borracha: devolve 20% do dano corpo a corpo.', react={'on': 'melee', 'do': 'reflect', 'chance': 100, 'mitigate': 0.2}),
  sig('Trampolim', 'Transforma o chão em trampolim: salta longe e cai sobre o alvo.', 'physical', 'tile', 'radius', 8, 9, radius=1, status=('derrubado', 1), fx={'leap': True}, anim='leap'))
g('controle_de_gases', 'Gás|veneno|envenenado|gas|desmaio|visao|onda|deslize|purificar|zona',
  inn('Imune a gás e fumaça.', immune=['envenenado', 'cegado']),
  sig('Sala sem Ar', 'Rouba o ar de uma área: sufoca e enfraquece todos dentro.', 'magic', 'tile', 'radius', 6, 8, radius=2, el='veneno', status=('enfraquecido', 2), fx={'cloud': 'gas_fetido'}, anim='smoke'))
g('controle_de_particulas', 'Partículas|-|-|-|desfaz|dominio|area|deslize|escudo|zona',
  inn('Partículas cortantes: golpes ignoram 25% da armadura.', pierce=0.25),
  sig('Nuvem Cortante', 'Uma nuvem de partículas que corta tudo em volta do alvo.', 'magic', 'tile', 'radius', 6, 10, radius=1, status=('sangramento', 2), fx={'pierce': 0.5}, anim='smoke'))

# ───────────────────────────── VI. Transformação ─────────────────────────────
g('metamorfose', 'Forma|-|-|-|confusao|mobilidade|soco|salto|inspirar|empurrao',
  inn('Forma livre: +1 de deslocamento e escala paredes.', moveBonus=1, climb=True),
  sig('Mudar no Golpe', 'Muda de forma no meio do golpe: ataca e fica camuflado.', 'physical', rng=1, pw=11, fx={'self': st('camuflado', 2), 'fromHiding': 0.5}, anim='slash'))
g('invisibilidade', 'Invisível|-|-|-|cegueira|visao|preciso|fase|inspirar|prender',
  inn('Invisível: começa escondido e se esconde de graça.', freeHide=1),
  sig('Sumir com Todos', 'Torna invisíveis ele e os aliados ao lado.', 'buff', 'self', 'radius', 0, 0, radius=1, mp=9, cd=5, st=40, fx={'aura': {'radius': 1, 'allies': True, 'status': st('camuflado', 2)}, 'self': st('camuflado', 2)}, anim='smoke'))
g('forma_aquatica', 'Guelras|agua|molhado|agua|exaustao|mobilidade|soco|deslize|cura|puxao',
  inn('Leva a água junto: regenera 4% por turno quando molhado.', regen=0.03, immune=['molhado']),
  sig('Jato de Guelras', 'Cospe um jato de água sob pressão: empurra e molha em linha.', 'magic', 'tile', 'line', 5, 9, el='agua', status=('molhado', 2), fx={'knock': 2, 'surface': 'agua'}, anim='beam'))
g('forma_felina', 'Garra|-|sangramento|-|exaustao|mobilidade|soco|salto|inspirar|prender',
  inn('Felino: cai sempre de pé (não sofre dano de queda) e +15 de esquiva.', evasion=15, climb=True),
  sig('Bote', 'Salta sobre o alvo de longe e crava as garras.', 'physical', rng=5, pw=11, status=('sangramento', 2), fx={'leap': True, 'fromAbove': 0.3}, anim='leap'))
g('forma_colossal', 'Colosso|terra|derrubado|-|exaustao|couraca|area|salto|escudo|empurrao',
  inn('Colossal: +30% de vida efetiva e não pode ser empurrado.', reduce={'physical': 0.2}, immune=['derrubado']),
  sig('Pisar no Prédio', 'Pisa com o peso de um colosso: área enorme, derruba e destrói.', 'physical', 'self', 'radius', 0, 15, radius=2, status=('derrubado', 1), fx={'demolish': 4, 'destroyProps': True}, mp=13, cd=5, st=55, anim='nova'))
g('forma_compacta', 'Compacto|-|-|-|desmaio|visao|preciso|fase|inspirar|prender',
  inn('Pequeno: +20 de esquiva e passa sem provocar ataque de oportunidade.', evasion=20, noOpportunity=True),
  sig('Dentro da Armadura', 'Entra na armadura do inimigo e ataca por dentro.', 'physical', rng=1, pw=10, fx={'pierce': 1, 'hits': 2}, anim='thrust'))
g('forma_gasosa', 'Névoa|-|cegado|fumaca|desfaz|mobilidade|onda|fase|inspirar|zona',
  inn('Nuvem viva: 30% menos dano físico.', reduce={'physical': 0.3}),
  sig('Nuvem Sufocante', 'Envolve uma área: cega e sufoca quem estiver dentro.', 'magic', 'tile', 'radius', 4, 7, radius=1, status=('cegado', 2), fx={'leap': True, 'cloud': 'fumaca'}, anim='smoke'))
g('forma_liquida', 'Líquido|agua|molhado|agua|desfaz|mobilidade|onda|deslize|cura|puxao',
  inn('Líquido: passa por frestas e não provoca ataques de oportunidade.', noOpportunity=True, reduce={'physical': 0.15}),
  sig('Onda Viva', 'Vira onda e passa por cima dos inimigos em linha.', 'physical', 'tile', 'line', 6, 10, el='agua', status=('molhado', 2), fx={'dashThrough': True, 'surface': 'agua'}, anim='dash'))
g('forma_energetica', 'Raio Vivo|eletricidade|eletrocutado|-|choque|mobilidade|rajada|fase|inspirar|zona',
  inn('Corpo de energia: imune a eletricidade e +2 de deslocamento.', immune=['eletrocutado'], moveBonus=2),
  sig('Velocidade da Luz', 'Vira luz e reaparece longe, explodindo em volta.', 'magic', 'tile', 'single', 9, 10, el='eletricidade', fx={'teleport': True, 'burstAround': {'radius': 1, 'power': 9, 'around': 'self'}}, anim='blink'))
g('forma_metalica', 'Ferro|-|-|-|trava|couraca|soco|deslize|escudo|empurrao',
  inn('Corpo de metal: 30% menos dano físico, mas lento (−1 de deslocamento).', reduce={'physical': 0.3}, moveBonus=-1),
  sig('Punho de Aço', 'Soco de aço maciço que arremessa e quebra a armadura.', 'physical', rng=1, pw=14, status=('quebrado', 2), fx={'knock': 2}, anim='charge'))
g('forma_sombria', 'Sombra|sombra|cegado|-|cegueira|mobilidade|preciso|fase|inspirar|prender',
  inn('Corpo de sombra: esconde-se em qualquer lugar e golpes escondidos dobram.', hide='any', freeHide=1),
  sig('Atravessar a Sombra', 'Some numa sombra e ataca de dentro dela, pelas costas.', 'magic', rng=7, pw=12, el='sombra', fx={'teleport': True, 'backstab': 0.5}, anim='blink'))
g('divisao_corporal', 'Partes|-|-|-|desmaio|mobilidade|projetil|salto|inspirar|prender',
  inn('Partes soltas: ataque básico acerta 2 vezes com dano menor.', chargeEvery={'n': 2, 'power': 5, 'radius': 0}),
  sig('Enxame de Partes', 'Separa o corpo e ataca 4 inimigos aleatórios em volta.', 'physical', 'tile', 'radius', 5, 7, radius=2, fx={'randomTargets': 4}, anim='volley'))
g('fusao_biologica', 'Quimera|-|-|-|descontrole|furia|soco|salto|cura|prender',
  inn('Quimera: regenera 3% por turno e +10% de dano físico.', regen=0.03, physBoost=0.1),
  sig('Fundir-se ao Aliado', 'Funde-se a um aliado: os dois ganham escudo e ficam velozes.', 'buff', 'ally', rng=1, pw=0, mp=10, cd=5, st=40, fx={'allyShield': 0.3, 'self': st('veloz', 2)}, anim='buff'))
g('adaptacao_evolutiva', 'Evolução|-|-|-|fome|couraca|soco|deslize|escudo|prender',
  inn('Evolui: cada golpe recebido dá +3% de redução de dano (até 30%).', shieldFromLost=0.2),
  sig('Evoluir Contra', 'Evolui contra o que o feriu: fortificado por 3 turnos e escudo de 20% da vida.', 'buff', 'self', rng=0, pw=0, mp=8, cd=4, st=35, fx={'self': st('fortificado', 3), 'shield': 0.2}, anim='buff'))
g('metamorfose_progressiva', 'Forma Final|-|-|-|descontrole|furia|soco|salto|inspirar|empurrao',
  inn('Cresce na luta: +5% de dano por turno de batalha (até 40%).', fury=1.25, furyHaste=0.2),
  sig('Forma Final', 'Assume a forma final: dano e velocidade altos por 3 turnos.', 'buff', 'self', rng=0, pw=0, mp=12, cd=6, st=50, fx={'self': st('frenesi', 3), 'extraTurn': True}, anim='buff'))

# ───────────────────────────── VII. Espaço ─────────────────────────────
g('teletransporte_de_grupo', 'Salto|-|-|-|desmaio|mobilidade|preciso|troca|inspirar|prender',
  inn('Leva junto: aliados ao lado agem mais cedo.', aura={'radius': 1, 'allies': True, 'status': st('veloz', 1)}),
  sig('Evacuar', 'Teleporta o esquadrão ao lado para um ponto seguro.', 'utility', 'tile', 'single', 8, 0, mp=12, cd=6, st=55, fx={'teleport': True, 'aura': {'radius': 1, 'allies': True, 'status': st('protegido', 1)}}, anim='blink'))
g('dobra_espacial', 'Dobra|-|-|-|confusao|mobilidade|preciso|troca|inspirar|puxao',
  inn('Atalhos: +2 de deslocamento.', moveBonus=2),
  sig('Atalho', 'Dobra o espaço e puxa o alvo para perto, sem defesa.', 'magic', rng=8, pw=9, status=('exposto', 1), fx={'pull': 4}, anim='blink'))
g('faseamento', 'Fase|sombra|-|-|desfaz|mobilidade|preciso|fase|inspirar|prender',
  inn('Fora de fase: 25% de chance de golpes o atravessarem.', react={'on': 'any', 'do': 'dodge', 'chance': 25}),
  sig('Golpe de Fora de Fase', 'Ataca de fora de fase: ignora toda armadura e cobertura.', 'magic', rng=1, pw=12, el='sombra', fx={'pierce': 1, 'through': True}, anim='claw'))
g('bolso_dimensional', 'Bolso|-|aprisionado|-|desmaio|guardiao|preciso|troca|escudo|prender',
  inn('Bolso: carrega utilitários sem gastar ação para pegar (técnicas custam menos).', mpDiscount={'pct': 0.15}),
  sig('Guardar no Bolso', 'Guarda um inimigo no bolso dimensional por 2 turnos.', 'magic', rng=1, pw=0, status=('aprisionado', 2), fx={'noDamage': True}, mp=11, cd=5, st=45, anim='orb'))
g('ancora_espacial', 'Âncora|-|ancorado|-|trava|guardiao|preciso|deslize|escudo|prender',
  inn('Ancorado: não pode ser empurrado nem derrubado.', immune=['derrubado']),
  sig('Âncora Total', 'Ninguém numa área grande se move: imobilizados.', 'magic', 'tile', 'radius', 6, 0, radius=2, status=('imobilizado', 2), fx={'noDamage': True}, anim='nova'))
g('expansao_espacial', 'Distância|-|lento|-|confusao|guardiao|preciso|troca|escudo|empurrao',
  inn('Espaço largo: inimigos que se aproximam ficam lentos.', aura={'radius': 2, 'status': st('lento', 1)}),
  sig('Corredor Infinito', 'Estica o espaço na frente dos inimigos: empurra todos para longe.', 'magic', 'self', 'radius', 0, 5, radius=2, fx={'knock': 4}, anim='nova'))
g('passagem_dimensional', 'Rasgo|sombra|-|-|desmaio|dominio|preciso|fase|inspirar|prender',
  inn('Vê o outro lado: enxerga escondidos.', seeHidden=True),
  sig('Jogar para o Outro Lado', 'Joga o alvo em outra dimensão: some da luta por 2 turnos.', 'magic', rng=5, pw=0, el='sombra', status=('aprisionado', 2), fx={'noDamage': True}, mp=13, cd=6, st=55, anim='blink'))

# ───────────────────────────── VIII. Tempo ─────────────────────────────
g('envelhecimento', 'Tempo|-|enfraquecido|-|envelhecer|dominio|preciso|deslize|inspirar|prender',
  inn('Toque do tempo: golpes enfraquecem.', onCastSelf={'status': st('afiado', 1)}),
  sig('Envelhecer', 'Envelhece o alvo: fraco e lento, e a armadura vira pó.', 'magic', rng=1, pw=9, status=('enfraquecido', 3), fx={'also': [st('lento', 2), st('quebrado', 2)]}, anim='claw'))
g('rejuvenescimento', 'Juventude|luz|-|-|envelhecer|imortal|preciso|deslize|cura|prender',
  inn('Rejuvenesce: regenera 4% por turno.', regen=0.04),
  sig('Renascer', 'Desfaz ferimentos de um aliado: cura 50% e limpa efeitos.', 'heal', 'ally', rng=5, pw=0, mp=10, cd=4, st=40, fx={'healPct': 0.5, 'cleanse': True}, anim='heal'))
g('visao_do_passado', 'Eco|-|marcado|-|confusao|visao|preciso|deslize|inspirar|prender',
  inn('Viu como o inimigo luta: +10 de esquiva e +10% de crítico.', evasion=10, critBonus=10),
  sig('Ler o Passado', 'Revê a luta do alvo: marca e expõe as fraquezas dele.', 'magic', rng=8, pw=0, status=('exposto', 3), fx={'noDamage': True, 'also': [st('marcado', 3)]}, anim='orb'))
g('loop_temporal', 'Laço|-|-|-|envelhecer|dominio|preciso|troca|inspirar|prender',
  inn('Laço: uma vez por batalha, volta de um golpe fatal.', cheatDeath=True),
  sig('Repetir o Turno', 'Repete o próprio turno: volta a posição, cura e age de novo.', 'buff', 'self', rng=0, pw=0, mp=14, cd=6, st=60, fx={'rewind': True, 'extraTurn': True}, anim='blink'))

# ───────────────────────────── IX. Sentidos ─────────────────────────────
g('paladar_analitico', 'Análise|veneno|-|-|confusao|visao|preciso|deslize|purificar|prender',
  inn('Analisa: imune a venenos.', immune=['envenenado']),
  sig('Antídoto Instantâneo', 'Prova e neutraliza: limpa um aliado e o torna imune a veneno.', 'heal', 'ally', rng=1, pw=0, mp=5, cd=2, st=15, fx={'cleanse': True, 'healPct': 0.2}, anim='heal'))
g('deteccao_de_vida', 'Vida|-|marcado|-|confusao|visao|preciso|deslize|inspirar|prender',
  inn('Sente vida: enxerga escondidos através de paredes.', seeHidden=True),
  sig('Pulso de Vida', 'Revela todos os seres vivos do mapa e marca os inimigos perto.', 'utility', 'self', 'radius', 0, 0, radius=4, mp=5, cd=4, st=15, status=('marcado', 2), fx={'reveal': True, 'noDamage': True}, anim='nova'))
g('percepcao_de_perigo', 'Arrepio|-|-|-|confusao|visao|preciso|deslize|inspirar|prender',
  inn('Nunca é pego de surpresa e desvia de 15% dos tiros.', noSurprise=True, react={'on': 'ranged', 'do': 'dodge', 'chance': 15}),
  sig('Instinto', 'Sente o próximo golpe: preparado para reagir e com escudo de 20% da vida.', 'buff', 'self', rng=0, pw=0, mp=6, cd=3, st=20, fx={'self': st('preparado', 1), 'shield': 0.2}, anim='buff'))
g('rastreamento', 'Rastro|-|marcado|-|confusao|visao|preciso|deslize|inspirar|prender',
  inn('Caçador: +15% de dano contra alvos marcados.', vs={'status': 'marcado', 'mult': 1.15}),
  sig('Marca do Caçador', 'Marca o alvo: não consegue se esconder e todos acertam mais nele.', 'magic', rng=10, pw=0, status=('marcado', 4), fx={'noDamage': True, 'reveal': True}, anim='arrow'))
g('previsao_de_movimento', 'Previsão|-|-|-|confusao|visao|preciso|deslize|inspirar|prender',
  inn('Atira onde o alvo vai estar: +10 de acerto e ignora esquiva.', steadyAim=0.15),
  sig('Tiro no Futuro', 'Atira onde o alvo vai estar: acerto garantido e crítico alto.', 'ranged', rng=-1, pw=11, fx={'crit': 40, 'homing': True}, anim='arrow'))
g('deteccao_de_poder', 'Medida|-|exposto|-|confusao|visao|preciso|deslize|inspirar|prender',
  inn('Lê Dons: +20% de dano contra alvos vulneráveis.', vs={'status': 'vulneravel', 'mult': 1.2}),
  sig('Expor o Dom', 'Expõe as falhas do Dom do alvo: vulnerável e com Strain alto.', 'magic', rng=8, pw=0, status=('vulneravel', 3), fx={'noDamage': True}, anim='orb'))
g('deteccao_emocional', 'Emoção|-|-|-|confusao|visao|preciso|deslize|inspirar|prender',
  inn('Sabe quem vai atacar: +10 de esquiva.', evasion=10),
  sig('Ler o Campo', 'Lê as emoções: revela todos e deixa um inimigo com medo.', 'magic', rng=7, pw=0, status=('medo', 2), fx={'noDamage': True, 'reveal': True}, anim='orb'))
g('deteccao_mental', 'Pensamento|-|-|-|confusao|visao|preciso|deslize|inspirar|prender',
  inn('Ouve planos: não é pego de surpresa e vê escondidos.', noSurprise=True, seeHidden=True),
  sig('Ouvir o Plano', 'Ouve o plano do alvo: ele perde a vez e fica exposto.', 'magic', rng=8, pw=0, status=('exposto', 2), fx={'noDamage': True, 'gaugeShift': True}, anim='orb'))

# ───────────────────────────── X. Criação ─────────────────────────────
g('criacao_de_armadura', 'Armadura|-|-|-|trava|couraca|soco|deslize|escudo|prender',
  inn('Armadura criada: 20% menos dano físico.', reduce={'physical': 0.2}),
  sig('Armadura de Grupo', 'Cria armaduras nos aliados em volta: escudo de 25% da vida.', 'buff', 'self', 'radius', 0, 0, radius=2, mp=9, cd=4, st=35, fx={'allyShield': 0.25}, anim='buff'))
g('criacao_de_energia', 'Gerador|eletricidade|-|-|choque|guardiao|rajada|propulsao|inspirar|zona',
  inn('Gerador vivo: recupera Stamina todo turno.', mpRegen=3),
  sig('Usina', 'Recarrega aliados em volta: recargas diminuem e todos agem mais cedo.', 'buff', 'self', 'radius', 0, 0, radius=2, mp=8, cd=5, st=35, fx={'reduceCooldowns': 2, 'aura': {'radius': 2, 'allies': True, 'status': st('eficiente', 2)}}, anim='buff'))
g('construtos_psiquicos', 'Construto|-|preso|-|confusao|guardiao|projetil|salto|escudo|prender',
  inn('Construtos mentais: técnicas prendem às vezes.', critBonus=5),
  sig('Mão Mental', 'Uma mão gigante que só os inimigos sentem: agarra e esmaga.', 'magic', rng=6, pw=10, status=('preso', 2), fx={'grab': True}, anim='claw'))
g('criacao_elemental', 'Elementos|fogo|-|fogo|queimadura|dominio|rajada|propulsao|inspirar|zona',
  inn('Domina os elementos: +15% de dano elemental.', elementBoost={'mult': 1.15}),
  sig('Choque Elemental', 'Combina fogo e gelo: explosão de vapor que queima e cega.', 'magic', 'tile', 'radius', 6, 12, radius=1, el='fogo', status=('queimando', 2), fx={'cloud': 'vapor_fervente'}, anim='meteor'))
g('criacao_cristalina', 'Cristal|luz|-|parede|exaustao|couraca|projetil|salto|escudo|prender',
  inn('Cristais crescem: +10% de dano de projéteis.', magicBoost=0.1),
  sig('Catedral de Cristal', 'Ergue pilares de cristal que viram cobertura e ferem quem está perto.', 'magic', 'tile', 'radius', 5, 6, radius=1, el='luz', fx={'build': {'shape': 'pillar', 'height': 3, 'turns': 4}}, anim='summon'))
g('invocacao_animal', 'Fera|-|-|-|exaustao|guardiao|projetil|salto|inspirar|prender',
  inn('Ligação animal: feras alteradas o atacam menos (+10 de esquiva).', evasion=10),
  sig('Chamar a Matilha', 'Chama feras que atacam até 3 inimigos em volta.', 'physical', 'tile', 'radius', 6, 8, radius=2, status=('sangramento', 1), fx={'randomTargets': 3}, anim='summon'))
g('invocacao_monstruosa', 'Monstro|sombra|medo|-|descontrole|dominio|area|salto|escudo|empurrao',
  inn('Aura monstruosa: quem o ataca de perto fica com medo às vezes.', react={'on': 'melee', 'do': 'status', 'chance': 20, 'status': st('medo', 1)}),
  sig('Monstro Colossal', 'Invoca um monstro que esmaga uma área e aterroriza.', 'physical', 'tile', 'radius', 6, 14, radius=2, el='sombra', status=('medo', 1), fx={'demolish': 2}, mp=13, cd=5, st=55, anim='summon'))
g('criacao_de_campo', 'Campo|-|lento|-|confusao|guardiao|area|deslize|escudo|zona',
  inn('Campo: aliados ao lado recebem 10% menos dano.', aura={'radius': 1, 'allies': True, 'status': st('protegido', 1)}),
  sig('Campo Vivo', 'Cria um campo: inimigos dentro ficam lentos e aliados dentro regeneram.', 'magic', 'tile', 'radius', 6, 0, radius=2, status=('lento', 3), fx={'noDamage': True, 'aura': {'radius': 2, 'allies': True, 'status': st('regenerando', 2)}}, anim='nova'))
g('criacao_biologica', 'Enxame|veneno|envenenado|esporos|fome|guardiao|projetil|salto|cura|zona',
  inn('Organismos o servem: regenera 3% por turno.', regen=0.03),
  sig('Enxame', 'Solta um enxame que envenena inimigos e cura aliados na área.', 'magic', 'tile', 'radius', 6, 7, radius=2, el='veneno', status=('envenenado', 3), fx={'spareAllies': True, 'healPct': 0.1}, anim='smoke'))

# ───────────────────────────── XI. Controle ─────────────────────────────
g('controle_mental_256', 'Voz|-|encantado|-|confusao|dominio|preciso|deslize|inspirar|prender',
  inn('Voz de comando: quem o ataca de perto fica provocado às vezes.', react={'on': 'melee', 'do': 'status', 'chance': 30, 'status': st('provocado', 1)}),
  sig('Ordem', 'Quem ouvir a voz obedece: encanta todos numa área pequena.', 'magic', 'tile', 'radius', 5, 0, radius=1, status=('encantado', 1), fx={'noDamage': True}, mp=12, cd=5, st=55, anim='shout'))
g('controle_animal', 'Fera|-|encantado|-|exaustao|guardiao|preciso|salto|inspirar|prender',
  inn('Fala com as feras: +10 de esquiva e enxerga escondidos.', evasion=10, seeHidden=True),
  sig('Domar Fera', 'Doma uma besta: ela luta do seu lado por 3 turnos.', 'magic', rng=6, pw=0, status=('encantado', 3), fx={'noDamage': True}, anim='orb'))
g('controle_de_maquinas', 'Máquina|eletricidade|desarmado|-|choque|visao|preciso|deslize|inspirar|prender',
  inn('Máquinas obedecem: quem o ataca de perto pode ficar desarmado.', react={'on': 'melee', 'do': 'status', 'chance': 20, 'status': st('desarmado', 1)}),
  sig('Tomar Controle', 'Desliga as armas do alvo e o deixa sem itens.', 'magic', rng=7, pw=5, el='eletricidade', status=('desarmado', 2), fx={'also': [st('sem_itens', 2)]}, anim='bolt'))
g('controle_de_tecnologia', 'Rede|eletricidade|desarmado|-|choque|visao|preciso|deslize|inspirar|zona',
  inn('Hacker vivo: técnicas custam 15% menos.', mpDiscount={'pct': 0.15}),
  sig('Apagão de Armas', 'Desliga as armas de fogo de todos os inimigos numa área.', 'magic', 'tile', 'radius', 7, 0, radius=2, el='eletricidade', status=('desarmado', 2), fx={'noDamage': True}, anim='nova'))
g('controle_de_plantas', 'Mato|terra|preso|-|exaustao|guardiao|area|deslize|cura|prender',
  inn('O mato ajuda: imune a ser preso e se esconde em arbustos.', immune=['preso'], hide='bush'),
  sig('Mata Viva', 'Raízes saem numa área grande e prendem todos.', 'magic', 'tile', 'radius', 6, 6, radius=2, el='terra', status=('preso', 2), anim='nova'))
g('controle_de_insetos', 'Enxame|veneno|envenenado|esporos|exaustao|guardiao|area|deslize|inspirar|zona',
  inn('Nuvem de insetos: quem o ataca de perto é picado (envenena).', react={'on': 'melee', 'do': 'status', 'status': st('envenenado', 2), 'damage': 4, 'element': 'veneno'}),
  sig('Nuvem Viva', 'Um enxame que persegue: envenena e cega numa área.', 'magic', 'tile', 'radius', 7, 6, radius=2, el='veneno', status=('envenenado', 3), fx={'also': [st('cegado', 1)]}, anim='smoke'))
g('controle_de_agua', 'Água|agua|molhado|agua|exaustao|guardiao|onda|deslize|cura|puxao',
  inn('Água obedece: +20% de dano contra alvos molhados.', vs={'status': 'molhado', 'mult': 1.2}),
  sig('Afogar em Terra', 'Envolve o alvo numa bolha de água: submerso e sem ar.', 'magic', rng=6, pw=10, el='agua', status=('submerso', 2), anim='orb'))
g('controle_de_fogo', 'Chamas|fogo|queimando|fogo|queimadura|furia|rajada|propulsao|inspirar|zona',
  inn('Fogo obedece: imune a queimadura e +20% contra quem queima.', immune=['queimando'], vs={'status': 'queimando', 'mult': 1.2}),
  sig('Inferno', 'Aviva todo o fogo de uma área: chamas enormes.', 'magic', 'tile', 'radius', 6, 11, radius=2, el='fogo', status=('queimando', 3), fx={'surface': 'fogo'}, anim='meteor'))
g('controle_de_terra', 'Solo|terra|derrubado|lama|exaustao|couraca|area|deslize|escudo|empurrao',
  inn('Solo firme: imune a derrubar.', immune=['derrubado']),
  sig('Abrir o Chão', 'Abre um fosso sob o alvo: cai, fica preso e derrubado.', 'magic', 'tile', 'radius', 6, 11, radius=1, el='terra', status=('derrubado', 1), fx={'also': [st('preso', 1)], 'demolish': 2}, anim='nova'))
g('controle_de_energia', 'Energia|eletricidade|-|-|choque|dominio|rajada|propulsao|escudo|zona',
  inn('Redireciona: devolve 35% das técnicas de energia recebidas.', react={'on': 'magic', 'do': 'reflect', 'chance': 35}),
  sig('Roubar a Energia', 'Toma a energia de um inimigo e a devolve: tira Stamina e fere.', 'magic', rng=7, pw=10, el='eletricidade', fx={'mpBurn': 8, 'maxMpCut': 0.2}, anim='beam'))
g('controle_de_som', 'Eco|vento|atordoado|-|confusao|furia|onda|propulsao|inspirar|zona',
  inn('Usa o barulho: +15% de dano de onda e imune a atordoar.', immune=['atordoado'], magicBoost=0.1),
  sig('Eco Destrutivo', 'Usa os tiros inimigos como arma: onda sonora em cone que atordoa.', 'magic', 'tile', 'cone', 5, 10, el='vento', status=('atordoado', 1), anim='cone'))
g('controle_de_luz', 'Luz|luz|cegado|-|cegueira|visao|rajada|fase|cura|prender',
  inn('Brinca com a luz: +10 de esquiva e enxerga no escuro.', evasion=10, seeHidden=True),
  sig('Apagar as Luzes', 'Escurece uma área: inimigos cegos, aliados escondidos.', 'magic', 'tile', 'radius', 7, 0, radius=2, el='luz', status=('cegado', 2), fx={'noDamage': True, 'aura': {'radius': 2, 'allies': True, 'status': st('camuflado', 2)}}, anim='smoke'))
g('controle_de_sombra', 'Sombra|sombra|preso|-|cegueira|dominio|preciso|fase|inspirar|prender',
  inn('Sombras seguram: esconde-se em qualquer lugar.', hide='any'),
  sig('Mãos de Sombra', 'As sombras agarram todos numa área: presos e cegos.', 'magic', 'tile', 'radius', 6, 6, radius=1, el='sombra', status=('preso', 2), fx={'also': [st('cegado', 1)]}, anim='nova'))
g('controle_de_gases_275', 'Gás|veneno|envenenado|gas|desmaio|guardiao|onda|deslize|purificar|zona',
  inn('Respira gás: imune a gás e envenenamento.', immune=['envenenado']),
  sig('Devolver o Gás', 'Junta o gás e a fumaça da área e joga nos inimigos.', 'magic', 'tile', 'radius', 6, 9, radius=1, el='veneno', status=('envenenado', 3), fx={'cloud': 'gas_fetido'}, anim='smoke'))
g('controle_de_particulas_277', 'Partícula|-|desarmado|-|desfaz|dominio|preciso|deslize|escudo|prender',
  inn('Desfaz no ar: 20% de chance de desfazer tiros recebidos.', react={'on': 'ranged', 'do': 'negate', 'chance': 20}),
  sig('Desfazer Armas', 'Desfaz a arma do alvo em partículas.', 'magic', rng=6, pw=6, status=('desarmado', 3), fx={'breakItem': True}, anim='orb'))
g('controle_de_pressao', 'Pressão|vento|derrubado|-|exaustao|furia|area|propulsao|escudo|empurrao',
  inn('Pressão: golpes empurram 1 casa a mais.', shoveBonus=1),
  sig('Esmagar no Chão', 'Esmaga o alvo contra o chão: derrubado e imobilizado.', 'magic', rng=6, pw=12, el='vento', status=('derrubado', 1), fx={'also': [st('imobilizado', 1)]}, anim='meteor'))

# ───────────────────────────── XII. Mobilidade ─────────────────────────────
g('voo', 'Voo|vento|-|-|exaustao|mobilidade|soco|salto|inspirar|empurrao',
  inn('Voa: ignora altura e terreno.', fly=True),
  sig('Carregar no Voo', 'Voa com um aliado e o deixa num lugar alto e seguro.', 'utility', 'ally', rng=1, pw=0, mp=7, cd=3, st=25, fx={'swap': True, 'self': st('voando', 2)}, anim='leap'))
g('levitacao', 'Leveza|vento|-|-|exaustao|mobilidade|preciso|salto|inspirar|prender',
  inn('Flutua: voa devagar sobre tudo.', fly=True, moveBonus=-1),
  sig('Fazer Flutuar', 'Faz um grupo flutuar: inimigos ficam sem alcance e expostos.', 'magic', 'tile', 'radius', 6, 0, radius=1, status=('voando', 2), fx={'noDamage': True, 'also': [st('sem_alcance', 1), st('exposto', 1)]}, anim='nova'))
g('supervelocidade', 'Borrão|-|-|-|exaustao|mobilidade|soco|deslize|inspirar|empurrao',
  inn('Borrão: a barra de ação enche 30% mais rápido.', haste=0.3),
  sig('Primeiro a Agir', 'Age antes de todos: ganha uma ação e deixa o alvo para trás no tempo.', 'physical', rng=4, pw=9, fx={'extraTurn': True, 'gaugeShift': True, 'leap': True}, anim='dash'))
g('propulsao', 'Jato|fogo|derrubado|-|queimadura|mobilidade|soco|propulsao|inspirar|empurrao',
  inn('Jatos: +2 de deslocamento em linha reta.', moveBonus=2),
  sig('Foguete', 'Arranca como foguete e atropela a linha inteira.', 'physical', 'tile', 'line', 7, 11, el='fogo', status=('derrubado', 1), fx={'dashThrough': True, 'ram': 0.1}, anim='dash'))
g('salto_dimensional', 'Piscar|-|-|-|confusao|mobilidade|preciso|fase|inspirar|prender',
  inn('Pisca: não provoca ataques de oportunidade.', noOpportunity=True),
  sig('Piscar e Cortar', 'Pisca para as costas do alvo e golpeia.', 'physical', rng=6, pw=11, fx={'teleport': True, 'backstab': 0.5}, anim='blink'))
g('movimento_aquatico', 'Correnteza|agua|molhado|agua|exaustao|mobilidade|soco|deslize|cura|puxao',
  inn('Na água vira torpedo: +3 de deslocamento em água e imune a molhado.', immune=['molhado', 'submerso'], moveBonus=1),
  sig('Torpedo', 'Mergulha numa onda que atropela em linha.', 'physical', 'tile', 'line', 6, 10, el='agua', status=('molhado', 2), fx={'dashThrough': True, 'surface': 'agua'}, anim='dash'))
g('movimento_subterraneo', 'Toupeira|terra|derrubado|-|exaustao|mobilidade|soco|fase|escudo|empurrao',
  inn('Cava: imune a derrubar e começa escondido.', immune=['derrubado'], freeHide=1),
  sig('Emergir', 'Some no chão e emerge debaixo do alvo, arremessando-o.', 'physical', rng=7, pw=12, el='terra', status=('derrubado', 1), fx={'teleport': True, 'knock': 2}, anim='leap'))
g('movimento_aereo', 'Manobra|vento|-|-|exaustao|mobilidade|preciso|salto|inspirar|empurrao',
  inn('Dança no ar: voa e desvia de 20% dos tiros.', fly=True, react={'on': 'ranged', 'do': 'dodge', 'chance': 20}),
  sig('Acrobacia Aérea', 'Rasante que golpeia 2 alvos e volta para o alto.', 'physical', rng=6, pw=8, el='vento', fx={'chain': 1, 'chainMult': 0.8, 'leap': True, 'fromAbove': 0.3}, anim='dash'))
g('teletransporte_curto', 'Salto|-|-|-|confusao|mobilidade|preciso|fase|inspirar|prender',
  inn('Saltinhos: +1 de deslocamento e ignora obstáculos.', moveBonus=1, climb=True),
  sig('Salto e Golpe', 'Teleporta-se até o alvo e golpeia na mesma ação.', 'physical', rng=6, pw=10, fx={'teleport': True}, anim='blink'))
g('teletransporte_sequencial', 'Saltos|-|-|-|desmaio|mobilidade|preciso|fase|inspirar|prender',
  inn('Saltos em sequência: não provoca ataques de oportunidade e +1 de deslocamento.', noOpportunity=True, moveBonus=1),
  sig('Tempestade de Saltos', 'Salta de lugar em lugar golpeando 4 inimigos aleatórios.', 'physical', 'tile', 'radius', 6, 8, radius=2, fx={'randomTargets': 4, 'teleport': True}, anim='blink'))
g('faseamento_movel', 'Passagem|sombra|-|-|desfaz|mobilidade|preciso|fase|inspirar|puxao',
  inn('Atravessa paredes ao andar.', noOpportunity=True, climb=True),
  sig('Arrastar pela Parede', 'Arrasta o alvo através de uma parede: fica exposto do outro lado.', 'magic', rng=1, pw=8, el='sombra', status=('exposto', 2), fx={'pull': 3, 'through': True}, anim='claw'))
g('dobra_de_trajetoria', 'Trajetória|-|-|-|confusao|visao|preciso|deslize|inspirar|prender',
  inn('Curva os tiros: ataques à distância ignoram cobertura parcial.', steadyAim=0.1, homing=True),
  sig('Ricochete Guiado', 'Um tiro que ricocheteia em 3 inimigos.', 'ranged', rng=-1, pw=9, fx={'chain': 3, 'chainMult': 0.8, 'homing': True}, anim='arrow'))

# ───────────────────────────── XIII. Suporte ─────────────────────────────
g('cura_acelerada', 'Cura|luz|-|-|exaustao|guardiao|preciso|deslize|cura|prender',
  inn('Curas dele rendem 25% a mais.', healBoost=0.25),
  sig('Cura Contínua', 'Cura um aliado e o deixa regenerando por 3 turnos.', 'heal', 'ally', rng=6, pw=0, mp=7, cd=3, st=25, fx={'healPct': 0.25, 'also': [st('regenerando', 3)]}, anim='heal'))
g('amplificacao_fisica', 'Força|-|-|-|exaustao|guardiao|preciso|deslize|inspirar|prender',
  inn('Aliados ao lado ficam afiados (+dano).', aura={'radius': 1, 'allies': True, 'status': st('afiado', 1)}),
  sig('Superforça Coletiva', 'Fortalece os aliados em volta: afiados e fortificados.', 'buff', 'self', 'radius', 0, 0, radius=2, mp=9, cd=4, st=35, fx={'aura': {'radius': 2, 'allies': True, 'status': st('fortificado', 2)}}, anim='shout'))
g('amplificacao_energetica', 'Reforço|luz|-|-|exaustao|guardiao|preciso|deslize|inspirar|prender',
  inn('Reforça Dons: aliados ao lado causam +10% com técnicas.', aura={'radius': 1, 'allies': True, 'status': st('inspirado', 1)}),
  sig('Dobrar o Dom', 'Reforça o Dom de um aliado: próxima técnica muito mais forte e age mais cedo.', 'buff', 'ally', rng=6, pw=0, mp=8, cd=4, st=30, fx={'imbue': {'turns': 2, 'bonus': 0.5}, 'gaugeShift': True}, anim='buff'))
g('transferencia_de_energia', 'Energia|-|-|-|desmaio|guardiao|preciso|deslize|inspirar|prender',
  inn('Doa fôlego: aliados ao lado recuperam Stamina.', aura={'radius': 1, 'allies': True, 'status': st('eficiente', 1)}),
  sig('Dar a Vez', 'Passa a própria vez para um aliado: a barra dele enche na hora.', 'buff', 'ally', rng=6, pw=0, mp=6, cd=4, st=25, fx={'grantAp': 2}, anim='buff'))
g('purificacao', 'Pureza|luz|-|-|exaustao|guardiao|preciso|deslize|purificar|prender',
  inn('Puro: imune a veneno e enfraquecer.', immune=['envenenado', 'enfraquecido']),
  sig('Purificar a Área', 'Limpa todos os aliados numa área grande e apaga superfícies e nuvens.', 'heal', 'self', 'radius', 0, 0, radius=3, mp=8, cd=4, st=30, fx={'cleanse': True, 'healPct': 0.1}, anim='heal'))
g('resistencia_compartilhada', 'Resistência|-|-|-|exaustao|guardiao|preciso|deslize|escudo|prender',
  inn('Aliados ao lado recebem menos dano elemental (protegidos).', aura={'radius': 1, 'allies': True, 'status': st('protegido', 1)}),
  sig('Imunidade de Grupo', 'Aliados em volta ficam protegidos e imunes a efeitos por 2 turnos.', 'buff', 'self', 'radius', 0, 0, radius=2, mp=9, cd=4, st=35, fx={'aura': {'radius': 2, 'allies': True, 'status': st('inabalavel', 2)}, 'allyShield': 0.15}, anim='buff'))
g('comunicacao_mental', 'Ordem|-|-|-|confusao|guardiao|preciso|deslize|inspirar|prender',
  inn('Comando silencioso: aliados não são pegos de surpresa.', noSurprise=True),
  sig('Ordem Silenciosa', 'Uma ordem mental: aliados em volta agem mais cedo.', 'buff', 'self', 'radius', 0, 0, radius=3, mp=8, cd=4, st=30, fx={'aura': {'radius': 3, 'allies': True, 'status': st('veloz', 1)}}, anim='shout'))
g('localizacao_aliada', 'Ligação|-|-|-|confusao|guardiao|preciso|deslize|escudo|prender',
  inn('Sente os aliados: intercepta 30% dos golpes num aliado ao lado.', intercept={'radius': 1, 'pct': 0.3, 'mitigate': 0.3}),
  sig('Chegar a Tempo', 'Teleporta-se para o lado de um aliado e o protege com escudo.', 'buff', 'ally', rng=8, pw=0, mp=8, cd=4, st=30, fx={'allyShield': 0.3, 'teleport': True}, anim='blink'))
g('transferencia_de_memoria', 'Lembrança|-|-|-|confusao|visao|preciso|deslize|inspirar|prender',
  inn('Lembra por todos: técnicas custam 15% menos.', mpDiscount={'pct': 0.15}),
  sig('Passar a Técnica', 'Passa experiência a um aliado: recargas zeram e ele fica afiado.', 'buff', 'ally', rng=6, pw=0, mp=9, cd=5, st=35, fx={'reduceCooldowns': 3, 'also': [st('afiado', 2)]}, anim='buff'))
g('estabilizacao', 'Estancar|-|-|-|exaustao|guardiao|preciso|deslize|cura|prender',
  inn('Ninguém sangra perto dele: aliados ao lado são imunes a sangramento.', aura={'radius': 1, 'allies': True, 'status': st('protegido', 1)}, immune=['sangramento']),
  sig('Estabilizar à Distância', 'Estabiliza um aliado: cura e remove sangramento e ferimentos.', 'heal', 'ally', rng=7, pw=0, mp=6, cd=3, st=20, fx={'healPct': 0.3, 'cleanse': True}, anim='heal'))
g('revitalizacao', 'Fôlego|-|-|-|exaustao|guardiao|preciso|deslize|cura|prender',
  inn('Fôlego: recupera Stamina todo turno.', mpRegen=2),
  sig('Fôlego Partilhado', 'Revigora um aliado: ele age de novo na hora e recupera Stamina.', 'buff', 'ally', rng=5, pw=0, mp=10, cd=5, st=40, fx={'grantAp': 2, 'healPct': 0.1}, anim='buff'))
g('purificacao_mental', 'Clareza|-|-|-|confusao|guardiao|preciso|deslize|purificar|prender',
  inn('Mente clara: imune a confusão e encanto.', immune=['confuso', 'encantado']),
  sig('Libertar', 'Liberta aliados controlados ou confusos em volta.', 'heal', 'self', 'radius', 0, 0, radius=3, mp=7, cd=4, st=25, fx={'cleanse': True}, anim='heal'))
g('aceleracao_metabolica', 'Metabolismo|-|-|-|fome|guardiao|preciso|deslize|cura|prender',
  inn('Metabolismo coletivo: aliados ao lado regeneram.', aura={'radius': 1, 'allies': True, 'status': st('regenerando', 1)}),
  sig('Acelerar a Cura', 'Todos os aliados em volta regeneram por 3 turnos.', 'heal', 'self', 'radius', 0, 0, radius=2, mp=8, cd=4, st=30, fx={'healPct': 0.1, 'aura': {'radius': 2, 'allies': True, 'status': st('regenerando', 3)}}, anim='heal'))
g('campo_regenerativo', 'Santuário|luz|-|-|exaustao|guardiao|preciso|deslize|cura|zona',
  inn('Santuário: regenera 3% por turno.', regen=0.03),
  sig('Santuário', 'Cria um campo de cura: aliados dentro regeneram e ficam protegidos.', 'heal', 'tile', 'radius', 6, 0, radius=2, mp=10, cd=5, st=40, fx={'healPct': 0.2, 'aura': {'radius': 2, 'allies': True, 'status': st('protegido', 2)}}, anim='heal'))
g('campo_de_resistencia', 'Bastião|-|-|-|trava|guardiao|preciso|deslize|escudo|zona',
  inn('Bastião: aliados ao lado recebem 10% menos dano.', aura={'radius': 1, 'allies': True, 'status': st('protegido', 1)}),
  sig('Bastião', 'Um campo que corta à metade os tiros contra aliados dentro.', 'buff', 'self', 'radius', 0, 0, radius=2, mp=9, cd=4, st=35, fx={'allyShield': 0.2, 'aura': {'radius': 2, 'allies': True, 'status': st('fortificado', 2)}}, anim='buff'))

# ───────────────────────────── XIV. Anômalos ─────────────────────────────
g('manipulacao_da_realidade', 'Realidade|-|-|-|desfaz|dominio|preciso|troca|inspirar|prender',
  inn('A realidade cede: 20% de chance de qualquer golpe recebido não acontecer.', react={'on': 'any', 'do': 'negate', 'chance': 20}),
  sig('Reescrever', 'Reescreve uma regra: o alvo perde todos os reforços e o esquadrão age de novo.', 'magic', rng=8, pw=10, fx={'dispel': True, 'invertBuffs': True, 'aura': {'radius': 3, 'allies': True, 'status': st('veloz', 1)}}, mp=15, cd=6, st=65, anim='orb'))
g('controle_temporal', 'Tempo|-|lento|-|envelhecer|dominio|preciso|troca|inspirar|prender',
  inn('Senhor do tempo: a barra enche 20% mais rápido.', haste=0.2),
  sig('Dono do Tempo', 'Para o tempo dos inimigos em volta e acelera o próprio.', 'magic', 'self', 'radius', 0, 0, radius=2, status=('atordoado', 1), fx={'noDamage': True, 'gaugeShift': True, 'extraTurn': True}, mp=15, cd=6, st=65, anim='nova'))
g('manipulacao_dimensional', 'Dimensão|sombra|-|-|desfaz|dominio|preciso|fase|inspirar|prender',
  inn('Entre dimensões: 20% de chance de golpes o atravessarem.', react={'on': 'any', 'do': 'dodge', 'chance': 20}),
  sig('Fundir Dimensões', 'Funde uma dimensão ao campo: tudo numa área é puxado e ferido.', 'magic', 'tile', 'radius', 7, 12, radius=2, el='sombra', fx={'vortex': 2, 'pierce': 0.5}, mp=14, cd=5, st=60, anim='nova'))
g('manipulacao_molecular', 'Molécula|-|quebrado|-|desfaz|dominio|area|deslize|cura|prender',
  inn('Mexe na matéria: ignora 40% da armadura e regenera 3%.', pierce=0.4, regen=0.03),
  sig('Recriar', 'Desfaz o alvo em escala molecular: dano igual a 40% da vida atual.', 'magic', rng=5, pw=8, fx={'currentHpPct': 0.4, 'pierce': 1, 'destroyProps': True}, mp=15, cd=6, st=65, anim='beam'))
g('negacao_de_poder', 'Negação|-|silenciado|-|desmaio|dominio|preciso|deslize|escudo|prender',
  inn('Ninguém usa Dom perto dele: inimigos ao lado silenciados.', aura={'radius': 1, 'status': st('silenciado', 1)}),
  sig('Mundo sem Dons', 'Apaga todos os Dons numa área grande por 2 turnos (inclusive aliados).', 'magic', 'self', 'radius', 0, 0, radius=3, status=('silenciado', 2), fx={'noDamage': True, 'dispel': True}, mp=14, cd=6, st=60, anim='nova'))
g('transferencia_de_poder', 'Doação|-|-|-|desmaio|dominio|preciso|deslize|inspirar|prender',
  inn('Compartilha o Dom: aliados ao lado causam +10% de dano.', aura={'radius': 1, 'allies': True, 'status': st('inspirado', 1)}),
  sig('Emprestar o Dom', 'Empresta o próprio poder a um aliado: ele age de novo com tudo reforçado.', 'buff', 'ally', rng=6, pw=0, mp=12, cd=6, st=55, fx={'grantAp': 2, 'imbue': {'turns': 3, 'bonus': 0.4}, 'reduceCooldowns': 2}, anim='buff'))
g('combinacao_de_poderes', 'Fusão|-|-|-|descontrole|dominio|area|propulsao|inspirar|zona',
  inn('Combina: +15% de dano por aliado com Dom ao lado.', flank=0.15, magicBoost=0.1),
  sig('Golpe Fundido', 'Funde o Dom dos aliados ao lado num golpe enorme.', 'magic', 'tile', 'radius', 7, 15, radius=1, fx={'pierce': 0.5, 'destroyProps': True}, mp=14, cd=5, st=60, anim='meteor'))
g('evolucao_adaptativa', 'Resposta|-|-|-|descontrole|dominio|soco|salto|escudo|prender',
  inn('Imprevisível: imune ao último efeito que sofreu e regenera 3%.', regen=0.03, ignoreOnce='atordoado'),
  sig('Nova Espécie', 'Evolui na hora: escudo grande, veloz e imune a efeitos por 2 turnos.', 'buff', 'self', rng=0, pw=0, mp=12, cd=6, st=55, fx={'shield': 0.35, 'self': st('inabalavel', 2), 'extraTurn': True}, anim='buff'))
g('absorcao_universal', 'Buraco Negro|sombra|-|-|desfaz|couraca|area|deslize|escudo|zona',
  inn('Absorve tudo: técnicas de qualquer elemento curam 30% do dano.', absorb=['fogo', 'gelo', 'eletricidade', 'luz', 'sombra', 'agua', 'vento', 'terra', 'veneno']),
  sig('Buraco Negro', 'Abre um buraco negro que puxa e fere tudo numa área.', 'magic', 'tile', 'radius', 7, 12, radius=2, el='sombra', fx={'vortex': 3}, mp=15, cd=6, st=65, anim='nova'))
g('manipulacao_da_vida', 'Vida|luz|-|-|envelhecer|imortal|preciso|deslize|cura|prender',
  inn('Domina a vida: regenera 5% por turno.', regen=0.05),
  sig('Devolver a Vida', 'Levanta um aliado caído com metade da vida (ou cura muito um ferido).', 'heal', 'ally', rng=6, pw=0, mp=15, cd=7, st=65, fx={'healPct': 0.6, 'cleanse': True}, anim='heal'))
g('manipulacao_da_morte', 'Limiar|sombra|condenado|-|envelhecer|dominio|preciso|fase|inspirar|prender',
  inn('Ninguém morre perto dele: aliados ao lado aguentam um golpe fatal.', lastStand=True, aura={'radius': 1, 'allies': True, 'status': st('protegido', 1)}),
  sig('Ceifar', 'Toca o alvo: condenado — se cair abaixo de um terço da vida, cai de vez.', 'magic', rng=1, pw=10, el='sombra', status=('condenado', 3), fx={'currentHpPct': 0.2}, mp=14, cd=5, st=60, anim='claw'))
g('criacao_de_vida', 'Gênese|terra|-|esporos|fome|guardiao|projetil|salto|cura|prender',
  inn('Gênese: aliados ao lado regeneram.', aura={'radius': 1, 'allies': True, 'status': st('regenerando', 1)}),
  sig('Criar um Aliado', 'Cria uma criatura viva que luta pelo esquadrão e cura quem está perto.', 'utility', 'tile', 'single', 5, 0, mp=14, cd=7, st=60, fx={'build': {'shape': 'pillar', 'height': 2, 'turns': 4}, 'healPct': 0.2, 'aura': {'radius': 1, 'allies': True, 'status': st('regenerando', 3)}}, anim='summon'))
g('consciencia_coletiva', 'Uma Mente|-|-|-|confusao|dominio|preciso|deslize|inspirar|prender',
  inn('Uma mente só: aliados não são pegos de surpresa e são imunes a medo.', noSurprise=True, immune=['medo']),
  sig('Pensar como Um', 'Todo o esquadrão age como um: todos ganham velocidade e escudo.', 'buff', 'self', 'radius', 0, 0, radius=4, mp=14, cd=6, st=60, fx={'allyShield': 0.2, 'aura': {'radius': 4, 'allies': True, 'status': st('veloz', 2)}}, anim='shout'))
g('controle_de_massa', 'Massa|terra|derrubado|-|desmaio|dominio|area|propulsao|escudo|empurrao',
  inn('Move montanhas: demolição em dobro e empurra mais longe.', demolish=2, shoveBonus=2),
  sig('Arremessar o Quarteirão', 'Arremessa um quarteirão inteiro numa área enorme.', 'magic', 'tile', 'radius', 9, 16, radius=3, el='terra', status=('derrubado', 1), fx={'destroyProps': True, 'demolish': 4}, mp=16, cd=7, st=70, anim='meteor'))
g('controle_gravitacional_extremo', 'Singularidade|sombra|derrubado|-|desmaio|dominio|area|propulsao|escudo|puxao',
  inn('Gravidade extrema: inimigos ao lado ficam lentos.', aura={'radius': 1, 'status': st('lento', 1)}),
  sig('Singularidade', 'Abre uma singularidade que puxa tudo e esmaga — inclusive aliados perto.', 'magic', 'tile', 'radius', 8, 16, radius=2, el='sombra', status=('derrubado', 1), fx={'vortex': 3, 'demolish': 3}, mp=16, cd=7, st=70, anim='nova'))
g('controle_espacial_extremo', 'Corte Espacial|-|-|-|confusao|dominio|preciso|troca|inspirar|prender',
  inn('Espaço dobrado: +2 de deslocamento e não provoca oportunidade.', moveBonus=2, noOpportunity=True),
  sig('Cortar o Espaço', 'Corta o espaço numa linha: tudo nela é ferido ignorando defesa e cobertura.', 'magic', 'tile', 'line', 10, 15, fx={'through': True, 'pierce': 1, 'destroyProps': True}, mp=16, cd=6, st=65, anim='beam'))
