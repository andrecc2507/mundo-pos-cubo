#!/usr/bin/env python3
"""
Gera src/game/data/gifts/signatures.json — o que faz cada Dom ÚNICO (Mundo Pós-Cubo).

Para cada um dos 179 Dons:
- innate: a passiva inata com efeito de verdade (antes era só texto) — `desc` + `fx` (SkillFx).
- signature: a técnica-assinatura, com regra própria (abre no NV 4 no nó "Assinatura" da árvore).

Os efeitos usam só o vocabulário do motor (SkillFx, estados e animações existentes); o teste
tests/game/gift_signatures.test.ts confere. Rodar: python3 tools/gen_signatures.py
"""
import json
import os

S = {}


def inn(desc, **fx):
    return {'desc': desc, 'fx': fx}


def sig(name, desc, kind='magic', target='enemy', shape='single', rng=5, pw=10, mp=9, cd=3, st=35, el=None, status=None, fx=None, radius=None, anim=None):
    s = {'name': name, 'description': desc, 'kind': kind, 'target': target, 'shape': shape, 'range': rng, 'power': pw, 'mp': mp, 'cooldown': cd, 'strain': st}
    if el: s['element'] = el
    if status: s['status'] = {'id': status[0], 'turns': status[1]} if isinstance(status, tuple) else status
    if fx: s['fx'] = fx
    if radius: s['radius'] = radius
    if anim: s['anim'] = anim
    return s


def st(i, t=1):
    return {'id': i, 'turns': t}


def add(gid, innate, signature):
    assert gid not in S, gid
    S[gid] = {'innate': innate, 'signature': signature}


# ───────────────────────────── Físicos ─────────────────────────────
add('densidade', inn('Pesado como chumbo: não pode ser derrubado nem empurrado; −1 de deslocamento.', immune=['derrubado'], moveBonus=-1),
    sig('Queda de Chumbo', 'Salta e cai com o peso de uma tonelada: dano em volta, derruba e racha o chão.', 'physical', 'tile', 'radius', 4, 11, radius=1, status=('derrubado', 1), fx={'leap': True, 'demolish': 2}, anim='leap'))
add('regeneracao', inn('Regenera 6% da vida por turno.', regen=0.06),
    sig('Fechar Feridas', 'Força a regeneração: cura 40% da vida e remove sangramento e venenos.', 'heal', 'self', rng=0, pw=0, mp=8, cd=4, st=30, fx={'healPct': 0.4, 'cleanse': True}, anim='heal'))
add('forca_explosiva', inn('A cada 3 golpes físicos, o próximo explode em volta.', chargeEvery={'n': 3, 'power': 8, 'radius': 1}),
    sig('Soco Detonante', 'Um soco que libera toda a energia guardada: arremessa o alvo 4 casas.', 'physical', rng=1, pw=15, mp=10, cd=3, st=40, fx={'knock': 4, 'demolish': 3}, anim='charge'))
add('endurecimento', inn('Pele de pedra: recebe 20% menos dano físico.', reduce={'physical': 0.2}),
    sig('Estátua', 'Endurece por completo: invulnerável por 1 turno e provoca os inimigos em volta.', 'buff', 'self', rng=0, pw=0, mp=8, cd=4, st=30, fx={'self': st('invulneravel', 1), 'aura': {'radius': 2, 'status': st('provocado', 1)}}, anim='buff'))
add('elasticidade', inn('Braços elásticos: ataque básico alcança +1 casa.', reachBonus=1),
    sig('Estilingue', 'Estica o corpo e se arremessa contra o alvo, puxando-o para o chão.', 'physical', rng=5, pw=12, mp=8, cd=3, st=30, status=('derrubado', 1), fx={'leap': True}, anim='leap'))
add('velocidade', inn('Pernas absurdas: +2 de deslocamento e a barra de ação enche 10% mais rápido.', moveBonus=2, haste=0.1),
    sig('Mil Golpes', 'Some e reaparece golpeando o mesmo alvo 4 vezes.', 'physical', rng=4, pw=4, mp=10, cd=3, st=40, fx={'hits': 4, 'leap': True}, anim='dash'))
add('pele_de_aco', inn('Metal na pele: 25% menos dano físico, mas 25% mais de eletricidade (sem defesa).', reduce={'physical': 0.25}),
    sig('Aríete de Aço', 'Corre em linha atravessando tudo: inimigos no caminho são derrubados.', 'physical', 'tile', 'line', 5, 11, st=35, status=('derrubado', 1), fx={'dashThrough': True}, anim='dash'))
add('garras', inn('Garras afiadas: golpes ignoram 30% da armadura.', pierce=0.3),
    sig('Dilacerar', 'Três cortes rápidos que abrem feridas profundas.', 'physical', rng=1, pw=5, mp=8, cd=2, st=30, fx={'hits': 3, 'also': [st('ferida_aberta', 2)]}, status=('sangramento', 3), anim='claw'))
add('asas', inn('Voa: ignora altura e terreno difícil.', fly=True),
    sig('Mergulho', 'Sobe alto e mergulha: dano extra vindo de cima e derruba.', 'physical', rng=6, pw=13, st=35, status=('derrubado', 1), fx={'leap': True, 'fromAbove': 0.5}, anim='leap'))
add('salto', inn('Pernas de mola: salta qualquer desnível.', climb=True, moveBonus=1),
    sig('Salto Meteoro', 'Salta até 7 casas e cai com tudo: dano em volta.', 'physical', 'tile', 'radius', 7, 10, radius=1, status=('derrubado', 1), fx={'leap': True}, anim='meteor'))
add('mimetismo', inn('Some na parede: começa escondido e se esconde de graça em qualquer lugar.', freeHide=1),
    sig('Golpe Camuflado', 'Ataca escondido: crítico garantido se não foi visto, e volta a se esconder.', 'physical', rng=1, pw=12, st=30, fx={'fromHiding': 1.0, 'self': st('camuflado', 2)}, anim='slash'))
add('bracos_extras', inn('Quatro braços: +1 golpe no ataque básico a cada 3 turnos.', chargeEvery={'n': 3, 'power': 6, 'radius': 0}),
    sig('Agarrar e Socar', 'Dois braços seguram, dois batem: prende e golpeia 2 vezes.', 'physical', rng=1, pw=7, st=35, status=('preso', 1), fx={'hits': 2, 'grab': True}, anim='claw'))
add('corpo_de_borracha', inn('Quica de volta: devolve 30% do dano corpo a corpo recebido.', react={'on': 'melee', 'do': 'reflect', 'chance': 100, 'mitigate': 0.3}),
    sig('Ricochete', 'Se lança contra um inimigo e ricocheteia em até 2 outros perto dele.', 'physical', rng=5, pw=10, st=35, fx={'leap': True, 'chain': 2, 'chainMult': 0.7}, anim='dash'))
add('resistencia_dor', inn('Não sente dor: uma vez por batalha, aguenta um golpe fatal com 1 de vida.', lastStand=True),
    sig('Teimosia', 'Ignora a dor: escudo de 30% da vida e imune a atordoar e derrubar por 2 turnos.', 'buff', 'self', rng=0, pw=0, mp=7, cd=4, st=30, fx={'shield': 0.3, 'self': st('inabalavel', 2)}, anim='buff'))
add('adrenalina', inn('Quanto pior, melhor: +35% de dano com menos da metade da vida e a barra enche mais rápido.', fury=1.35, furyHaste=0.4),
    sig('Pico de Adrenalina', 'Ganha um movimento e uma ação extra agora.', 'buff', 'self', rng=0, pw=0, mp=8, cd=5, st=45, fx={'extraTurn': True}, anim='buff'))
add('ossos_projeteis', inn('Lascas de osso: ataque à distância básico (alcance 4).', reachBonus=3),
    sig('Chuva de Ossos', 'Dispara uma saraivada em cone que perfura armaduras.', 'physical', 'tile', 'cone', 4, 9, st=35, fx={'pierce': 0.4}, status=('sangramento', 2), anim='volley'))
add('gigantismo', inn('Grande: +20% de vida e não pode ser empurrado.', immune=['derrubado'], physBoost=0.1),
    sig('Pisão do Gigante', 'Cresce e pisa: dano em área grande e derruba todos.', 'physical', 'self', 'radius', 0, 12, radius=2, status=('derrubado', 1), fx={'demolish': 3}, anim='nova'))
add('encolher', inn('Pequeno: +15 de esquiva.', evasion=15),
    sig('Picada Interna', 'Entra pela armadura e fere por dentro: ignora toda a defesa.', 'physical', rng=1, pw=11, st=30, fx={'pierce': 1, 'leap': True}, anim='thrust'))
add('sangue_acido', inn('Quem o fere corpo a corpo leva respingo de ácido.', react={'on': 'melee', 'do': 'status', 'status': st('envenenado', 2), 'damage': 6, 'element': 'veneno'}),
    sig('Jorro Ácido', 'Corta a própria mão e espirra ácido em cone: derrete armaduras.', 'magic', 'tile', 'cone', 3, 11, el='veneno', status=('quebrado', 2), fx={'pierce': 0.5}, anim='cone'))
add('folego', inn('Pulmões enormes: imune a fumaça e gás.', immune=['envenenado', 'cegado']),
    sig('Vendaval', 'Sopra em linha: empurra todos 3 casas e apaga fogo.', 'magic', 'tile', 'line', 5, 8, el='vento', fx={'knock': 3}, anim='cone'))
add('cauda', inn('Cauda forte: ataca quem tenta passar ao lado.', pursuit=True),
    sig('Varrida', 'Gira a cauda: acerta todos em volta e derruba.', 'physical', 'self', 'radius', 0, 9, radius=1, status=('derrubado', 1), anim='spin'))
add('chifres', inn('Investidas: +20% de dano se andou antes de atacar.', physBoost=0.1, moveBonus=1),
    sig('Chifrada', 'Corre e chifra: arremessa o alvo e quem estiver atrás dele.', 'physical', rng=5, pw=13, st=35, fx={'leap': True, 'knock': 3, 'ram': 0.3}, anim='dash'))
add('presas', inn('Mordida venenosa: golpes corpo a corpo envenenam.', onCastSelf={'status': st('afiado', 1)}),
    sig('Mordida Paralisante', 'Morde e injeta veneno paralisante.', 'physical', rng=1, pw=10, el='veneno', status=('imobilizado', 2), fx={'also': [st('envenenado', 3)]}, anim='claw'))
add('metabolismo', inn('Metabolismo acelerado: recupera 8% da Stamina por turno.', mpRegen=0.08),
    sig('Queimar Reservas', 'Queima a gordura do corpo: cura 25%, recupera Stamina e fica veloz.', 'heal', 'self', rng=0, pw=0, mp=0, cd=4, st=35, fx={'healPct': 0.25, 'self': st('veloz', 2)}, anim='heal'))
add('punho_sismico', inn('O chão treme: golpes físicos derrubam 20% das vezes.', onCastSelf={'status': st('afiado', 1)}),
    sig('Terremoto', 'Soca o chão: onda em linha que derruba e quebra cobertura.', 'physical', 'tile', 'line', 6, 12, el='terra', status=('derrubado', 1), fx={'demolish': 4, 'destroyProps': True}, anim='nova'))
add('couraca_ossea', inn('Placas de osso: escudo de 10% da vida no começo de cada luta.', reduce={'physical': 0.15}),
    sig('Couraça Total', 'As placas crescem: escudo de 45% da vida.', 'buff', 'self', rng=0, pw=0, mp=7, cd=4, st=30, fx={'shield': 0.45}, anim='buff'))
add('recarga', inn('Recupera o fôlego rápido: +10% de Stamina por turno.', mpRegen=0.1),
    sig('Segundo Fôlego', 'Recupera toda a Stamina e reduz as recargas das técnicas.', 'buff', 'self', rng=0, pw=0, mp=0, cd=5, st=40, fx={'reduceCooldowns': 2, 'self': st('eficiente', 2)}, anim='buff'))
add('corpo_termico', inn('Corpo quente: imune a congelar; quem o toca se queima.', immune=['congelado'], react={'on': 'melee', 'do': 'status', 'status': st('queimando', 2)}),
    sig('Abraço Térmico', 'Agarra e esquenta: queima e derrete o gelo em volta.', 'physical', rng=1, pw=11, el='fogo', status=('queimando', 3), fx={'grab': True}, anim='claw'))
add('carapaca', inn('Carapaça nas costas: 30% menos dano de quem ataca pelas costas.', frontGuard=0.15, reduce={'melee': 0.1}),
    sig('Rolar', 'Fecha-se na carapaça e rola atropelando em linha.', 'physical', 'tile', 'line', 5, 10, fx={'dashThrough': True, 'self': st('fortificado', 1)}, anim='dash'))
add('hiperflexibilidade', inn('Esquiva impossível: +12 de esquiva e nunca provoca ataque de oportunidade.', evasion=12, noOpportunity=True),
    sig('Contorção', 'Se enrola no inimigo: imobiliza e desarma.', 'physical', rng=1, pw=7, status=('imobilizado', 2), fx={'also': [st('desarmado', 1)]}, anim='claw'))
add('investida_bovina', inn('Atropela: avançar em linha derruba quem estiver na frente.', ram=0.3),
    sig('Estouro da Boiada', 'Corre até 6 casas atravessando todos; cada um leva mais dano.', 'physical', 'tile', 'line', 6, 10, status=('derrubado', 1), fx={'dashThrough': True, 'ram': 0.4}, anim='dash'))
add('tatuagem_viva', inn('Tatuagens vivas: ataques invocam uma marca que segue o alvo.', onCastSelf={'status': st('afiado', 1)}),
    sig('Tatuagens Soltas', 'As tatuagens saem da pele e criam cópias que confundem os inimigos.', 'buff', 'self', rng=0, pw=0, mp=9, cd=4, st=35, fx={'self': st('duplicatas', 3)}, anim='summon'))
add('musculo_hidraulico', inn('Músculos de pressão: +15% de dano físico, mas precisa de água (molhado dá +15% mais).', physBoost=0.15),
    sig('Prensa Hidráulica', 'Um golpe de pressão que esmaga a defesa: o alvo fica quebrado.', 'physical', rng=1, pw=14, el='agua', status=('quebrado', 2), fx={'knock': 2}, anim='charge'))
add('olho_de_aguia', inn('Vista de águia: +10 de precisão parado e +2 de alcance.', steadyAim=10, reachBonus=2),
    sig('Tiro Certeiro', 'Mira longa: crítico garantido a qualquer distância.', 'physical', rng=10, pw=12, st=30, fx={'crit': 100, 'homing': True}, anim='arrow'))
add('pele_refletora', inn('A pele espelha: devolve 25% do dano mágico recebido.', react={'on': 'magic', 'do': 'reflect', 'chance': 100, 'mitigate': 0.25}),
    sig('Clarão Refletido', 'Concentra a luz no corpo e solta: cega todos em volta.', 'magic', 'self', 'radius', 0, 8, el='luz', radius=2, status=('cegado', 2), anim='nova'))

# ───────────────────────────── Emissores ─────────────────────────────
add('eletricidade', inn('Condutor: dano elétrico +20%; molhados viram alvo fácil.', elementBoost={'element': 'eletricidade', 'mult': 1.2}),
    sig('Corrente em Cadeia', 'Uma descarga que salta para até 4 inimigos próximos.', 'magic', rng=5, pw=11, el='eletricidade', status=('eletrocutado', 1), fx={'chain': 4, 'chainMult': 0.75}, anim='bolt'))
add('calor', inn('Chamas: dano de fogo +20% e imune a queimar.', elementBoost={'element': 'fogo', 'mult': 1.2}, immune=['queimando']),
    sig('Coluna de Fogo', 'Uma coluna de fogo sobe do chão e deixa o lugar em chamas.', 'magic', 'tile', 'radius', 5, 12, el='fogo', radius=1, status=('queimando', 3), fx={'surface': 'fogo'}, anim='meteor'))
add('gelo', inn('Frio: imune a congelar; golpes de gelo deixam lento.', immune=['congelado'], elementBoost={'element': 'gelo', 'mult': 1.15}),
    sig('Prisão de Gelo', 'Congela o alvo dentro de um bloco de gelo.', 'magic', rng=5, pw=8, el='gelo', status=('congelado', 2), fx={'surface': 'gelo'}, anim='orb'))
add('luz', inn('Brilha: vê quem está escondido e cura 15% mais.', seeHidden=True, healBoost=0.15),
    sig('Raio Solar', 'Um raio de luz que atravessa a linha e cega.', 'magic', 'tile', 'line', 7, 11, el='luz', status=('cegado', 2), fx={'through': True, 'throughFalloff': 0.2}, anim='beam'))
add('som', inn('Grito: imune a atordoar.', immune=['atordoado']),
    sig('Grito Sônico', 'Um grito em cone que atordoa e silencia.', 'magic', 'tile', 'cone', 4, 9, el='vento', status=('atordoado', 1), fx={'also': [st('silenciado', 1)]}, anim='shout'))
add('acido', inn('Ácido: golpes deixam a armadura do alvo quebrada.', pierce=0.25),
    sig('Poça Corrosiva', 'Lança ácido em área: tudo nela perde a armadura e se envenena.', 'magic', 'tile', 'radius', 5, 9, el='veneno', radius=1, status=('quebrado', 3), fx={'also': [st('envenenado', 2)]}, anim='orb'))
add('plasma', inn('Plasma: ignora 40% da defesa.', pierce=0.4),
    sig('Lança de Plasma', 'Um feixe superaquecido que atravessa tudo em linha.', 'magic', 'tile', 'line', 8, 14, el='fogo', status=('queimando', 2), fx={'through': True, 'pierce': 0.6}, anim='beam'))
add('vapor', inn('Vapor: começa a luta envolto em névoa (difícil de acertar de longe).', evasion=8),
    sig('Nuvem Escaldante', 'Cobre a área com vapor fervente que queima e cega.', 'magic', 'tile', 'radius', 5, 7, el='agua', radius=2, status=('cegado', 1), fx={'cloud': 'vapor_fervente'}, anim='smoke'))
add('explosao', inn('Explosivo: ao cair, explode em volta.', deathBurst={'radius': 1, 'power': 12, 'element': 'fogo'}),
    sig('Detonação', 'Explosão concentrada nas palmas: área grande e derruba.', 'magic', 'tile', 'radius', 4, 15, el='fogo', radius=2, status=('derrubado', 1), fx={'demolish': 4}, anim='meteor'))
add('laser', inn('Mira laser: +10 de precisão.', steadyAim=10),
    sig('Varredura Laser', 'Varre a linha inteira: atinge todos sem perder força.', 'magic', 'tile', 'line', 9, 11, el='luz', fx={'through': True, 'homing': True}, anim='beam'))
add('radiacao', inn('Radioativo: inimigos a até 1 casa se enfraquecem a cada rodada.', aura={'radius': 1, 'status': st('enfraquecido', 1)}),
    sig('Meltdown', 'Libera radiação em volta: dano, enfraquece e corta a Stamina máxima.', 'magic', 'self', 'radius', 0, 10, el='veneno', radius=2, status=('enfraquecido', 3), fx={'maxMpCut': 0.25}, anim='nova'))
add('pressao_ar', inn('Ar comprimido: empurrões vão 1 casa mais longe.', shoveBonus=1),
    sig('Canhão de Ar', 'Uma bala de ar que arremessa o alvo 5 casas.', 'magic', rng=5, pw=10, el='vento', fx={'knock': 5}, anim='orb'))
add('vento', inn('Corrente de vento: +1 de deslocamento e projéteis inimigos erram mais.', moveBonus=1, reduce={'ranged': 0.15}),
    sig('Tornado', 'Um tornado que puxa todos para o centro e os joga no chão.', 'magic', 'tile', 'radius', 5, 9, el='vento', radius=2, status=('derrubado', 1), fx={'vortex': 2}, anim='nova'))
add('lama', inn('Lama: imune a enlamear e escorregar.', immune=['enlameado', 'derrubado']),
    sig('Pântano', 'Transforma a área em lama: todos ficam enlameados e lentos.', 'magic', 'tile', 'radius', 5, 5, el='terra', radius=2, status=('lento', 2), fx={'surface': 'terra', 'also': [st('enlameado', 2)]}, anim='orb'))
add('agua', inn('Água: imune a queimar; molhar facilita os choques aliados.', immune=['queimando']),
    sig('Jato de Pressão', 'Jato de água em linha que empurra e molha todos.', 'magic', 'tile', 'line', 6, 10, el='agua', status=('molhado', 3), fx={'knock': 2, 'through': True}, anim='beam'))
add('chama_azul', inn('Fogo azul: dano de fogo +35%.', elementBoost={'element': 'fogo', 'mult': 1.35}),
    sig('Inferno Azul', 'Labaredas azuis em cone que não se apagam com água.', 'magic', 'tile', 'cone', 4, 15, el='fogo', status=('queimando', 4), fx={'surface': 'fogo'}, anim='cone'))
add('nevoa', inn('Névoa: começa escondido e é mais difícil de mirar (+8 de esquiva).', evasion=8, freeHide=1),
    sig('Muralha de Névoa', 'Cobre uma área grande com névoa: aliados dentro ficam escondidos.', 'utility', 'tile', 'radius', 5, 0, radius=2, fx={'cloud': 'fumaca', 'noDamage': True}, anim='smoke'))
add('fumaca', inn('Fumaça: ao ser atingido, solta fumaça e se esconde (uma vez por rodada).', react={'on': 'any', 'do': 'retreat', 'chance': 30}),
    sig('Cortina de Fumaça', 'Fumaça densa em volta: inimigos perdem a mira.', 'utility', 'self', 'radius', 0, 0, radius=2, status=('cegado', 1), fx={'cloud': 'fumaca'}, anim='smoke'))
add('polvora', inn('Pólvora: golpes de fogo explodem em volta.', elementBoost={'element': 'fogo', 'mult': 1.15}),
    sig('Rastilho', 'Uma linha de pólvora que detona tudo pelo caminho.', 'magic', 'tile', 'line', 6, 12, el='fogo', status=('derrubado', 1), fx={'through': True, 'demolish': 2}, anim='bolt'))
add('esporos', inn('Esporos: aliados ao lado regeneram um pouco por rodada.', aura={'radius': 1, 'allies': True, 'status': st('regenerando', 1)}),
    sig('Nuvem de Esporos', 'Esporos que envenenam inimigos e deixam todos sonolentos.', 'magic', 'tile', 'radius', 5, 6, el='veneno', radius=2, status=('envenenado', 3), fx={'cloud': 'esporos'}, anim='smoke'))
add('feromonio', inn('Cheiro estranho: inimigos ao lado ficam confusos às vezes.', aura={'radius': 1, 'status': {'id': 'confuso', 'turns': 1, 'chance': 25}}),
    sig('Feromônio da Discórdia', 'Os inimigos na área se confundem e atacam uns aos outros.', 'magic', 'tile', 'radius', 5, 0, radius=1, status=('confuso', 2), fx={'noDamage': True}, anim='smoke'))
add('faiscas', inn('Faíscas: golpes elétricos pulam para mais 1 alvo.', elementBoost={'element': 'eletricidade', 'mult': 1.1}),
    sig('Chuva de Faíscas', 'Faíscas atingem 4 inimigos aleatórios à vista.', 'magic', rng=6, pw=7, el='eletricidade', status=('eletrocutado', 1), fx={'randomTargets': 4}, anim='volley'))
add('pulso_em', inn('Campo EM: imune a silenciar.', immune=['silenciado']),
    sig('Pulso', 'Um pulso em volta que silencia Dons e desliga armas por 1 turno.', 'magic', 'self', 'radius', 0, 6, el='eletricidade', radius=2, status=('silenciado', 2), fx={'also': [st('desarmado', 1)]}, anim='nova'))
add('ondas_choque', inn('Firme: não é derrubado pelas próprias ondas (imune a derrubar).', immune=['derrubado']),
    sig('Palmas Sísmicas', 'Bate as palmas: onda em cone que derruba e empurra.', 'magic', 'tile', 'cone', 4, 10, el='terra', status=('derrubado', 1), fx={'knock': 2}, anim='cone'))
add('laminas_ar', inn('Lâminas de ar: ataques à distância cortam (sangram).', reachBonus=2),
    sig('Tempestade de Lâminas', 'Cortes de vento em todos os inimigos numa área.', 'magic', 'tile', 'radius', 5, 10, el='vento', radius=1, status=('sangramento', 3), anim='volley'))
add('agulhas', inn('Agulhas: +2 de alcance no ataque básico.', reachBonus=2),
    sig('Rajada de Agulhas', 'Seis agulhas no mesmo alvo.', 'physical', rng=5, pw=3, fx={'hits': 6}, status=('sangramento', 2), anim='volley'))
add('seda', inn('Seda: imune a ficar preso.', immune=['preso', 'imobilizado']),
    sig('Casulo', 'Enrola o alvo num casulo de seda: preso e indefeso.', 'magic', rng=5, pw=4, status=('preso', 2), fx={'also': [st('desarmado', 2)]}, anim='orb'))
add('tinta', inn('Tinta: inimigos atingidos ficam marcados (todo mundo acerta mais).', onCastSelf={'status': st('afiado', 1)}),
    sig('Mancha', 'Jato de tinta em cone: cega e marca todos.', 'magic', 'tile', 'cone', 4, 4, status=('cegado', 2), fx={'also': [st('marcado', 3)], 'cloud': 'tinta'}, anim='cone'))
add('cinzas', inn('Cinzas: imune a cegar.', immune=['cegado']),
    sig('Chuva de Cinzas', 'Cinza quente cai na área: queima e cega.', 'magic', 'tile', 'radius', 5, 8, el='fogo', radius=2, status=('cegado', 2), fx={'also': [st('queimando', 2)]}, anim='smoke'))
add('brasas', inn('Brasas: queimaduras que causa duram +1 turno.', elementBoost={'element': 'fogo', 'mult': 1.1}),
    sig('Brasas Grudentas', 'Brasas que grudam: o alvo queima por muito tempo.', 'magic', rng=5, pw=8, el='fogo', status=('queimando', 5), fx={'surface': 'fogo'}, anim='orb'))
add('cristais', inn('Cristais: cobertura extra — 15% menos dano à distância.', reduce={'ranged': 0.15}),
    sig('Floresta de Cristais', 'Cristais brotam do chão em área: dano, sangramento e viram cobertura.', 'magic', 'tile', 'radius', 5, 10, radius=1, status=('sangramento', 2), fx={'build': {'shape': 'pillar', 'height': 2, 'turns': 3}}, anim='nova'))
add('oleo', inn('Escorregadio: imune a ser preso e agarrado.', immune=['preso', 'imobilizado']),
    sig('Mancha de Óleo', 'Espalha óleo inflamável: todos escorregam (e uma faísca vira incêndio).', 'magic', 'tile', 'radius', 5, 3, radius=2, status=('derrubado', 1), fx={'surface': 'oleo'}, anim='orb'))
add('nectar', inn('Néctar: curas que faz são 25% mais fortes.', healBoost=0.25),
    sig('Chuva de Néctar', 'Cura todos os aliados numa área grande e remove venenos.', 'heal', 'tile', 'radius', 5, 12, radius=2, fx={'cleanse': True}, anim='heal'))
add('bioluminescencia', inn('Brilha: aliados ao lado acertam mais no escuro (afiados).', aura={'radius': 1, 'allies': True, 'status': st('afiado', 1)}),
    sig('Farol', 'Clarão que revela tudo escondido e cega quem estiver perto.', 'magic', 'self', 'radius', 0, 4, el='luz', radius=3, status=('cegado', 1), fx={'reveal': True}, anim='nova'))
add('infravermelho', inn('Calor invisível: ataques ignoram cobertura.', homing=True),
    sig('Raio Térmico', 'Esquenta o alvo por dentro: ignora cobertura e armadura.', 'magic', rng=7, pw=12, el='fogo', status=('queimando', 2), fx={'homing': True, 'pierce': 0.5}, anim='beam'))
add('micro_ondas', inn('Micro-ondas: dano extra de 10% da vida atual do alvo.', currentHpPct=0.1),
    sig('Cozinhar', 'Esquenta o alvo por dentro: dano igual a 30% da vida atual.', 'magic', rng=6, pw=6, el='fogo', fx={'currentHpPct': 0.3, 'homing': True}, anim='beam'))
add('gas_sonifero', inn('Respira o próprio gás: imune a sono.', immune=['sono']),
    sig('Sono Profundo', 'Gás em área: todos dormem (acordam ao levar dano).', 'magic', 'tile', 'radius', 5, 0, el='veneno', radius=1, status=('sono', 3), fx={'noDamage': True, 'cloud': 'gas_fetido'}, anim='smoke'))
add('veneno', inn('Venenos: envenenamentos que causa doem 25% mais.', elementBoost={'element': 'veneno', 'mult': 1.25}),
    sig('Toxina Final', 'Detona todo o veneno do alvo de uma vez.', 'magic', rng=5, pw=8, el='veneno', fx={'detonate': ['envenenado'], 'also': [st('envenenado', 3)]}, anim='orb'))
add('eco_termico', inn('Calor sufocante: inimigos a até 1 casa ficam lentos.', aura={'radius': 1, 'status': st('lento', 1)}),
    sig('Onda de Calor', 'Uma onda de calor em área que deixa todos lentos e cansados.', 'magic', 'self', 'radius', 0, 7, el='fogo', radius=2, status=('lento', 2), fx={'mpBurn': 6}, anim='nova'))

# ───────────────────────────── Manipuladores ─────────────────────────────
add('vetor', inn('Redireciona: devolve 30% dos tiros recebidos.', react={'on': 'ranged', 'do': 'reflect', 'chance': 30}),
    sig('Redirecionar', 'Inverte o vetor do alvo: arremessa 5 casas contra o que estiver atrás.', 'magic', rng=6, pw=11, fx={'knock': 5}, status=('derrubado', 1), anim='bolt'))
add('gravidade', inn('Gravidade: inimigos a até 1 casa ficam lentos.', aura={'radius': 1, 'status': st('lento', 1)}),
    sig('Poço Gravitacional', 'Esmaga a área: puxa todos para o centro, dano e imobiliza.', 'magic', 'tile', 'radius', 5, 11, radius=2, status=('imobilizado', 1), fx={'vortex': 2}, anim='nova'))
add('magnetismo', inn('Ímã: tiros de armas de metal erram mais nele (−20%).', reduce={'ranged': 0.2}),
    sig('Desarmar', 'Arranca as armas de metal de todos numa área.', 'magic', 'tile', 'radius', 5, 5, el='eletricidade', radius=1, status=('desarmado', 2), fx={'pull': 1}, anim='orb'))
add('atrito', inn('Sem atrito sob os pés: +2 de deslocamento.', moveBonus=2),
    sig('Chão de Gelo Seco', 'Zera o atrito na área: todos escorregam e caem.', 'magic', 'tile', 'radius', 5, 4, radius=2, status=('derrubado', 2), fx={'surface': 'geada'}, anim='orb'))
add('impulso', inn('Guarda impulso: cada golpe recebido aumenta o próximo dano (+30% quando ferido).', fury=1.3),
    sig('Devolver Tudo', 'Solta o impulso guardado: dano maior quanto mais vida perdeu.', 'magic', rng=1, pw=12, fx={'shieldFromLost': 0.3, 'knock': 3}, anim='charge'))
add('inercia', inn('Inércia: não pode ser empurrado.', immune=['derrubado']),
    sig('Congelar Movimento', 'Para o alvo no lugar e zera a barra de ação dele.', 'magic', rng=5, pw=4, status=('imobilizado', 2), fx={'gaugeShift': True}, anim='orb'))
add('temperatura', inn('Controle térmico: imune a queimar e congelar.', immune=['queimando', 'congelado']),
    sig('Choque Térmico', 'Esquenta e esfria o alvo de uma vez: dano alto e armadura quebrada.', 'magic', rng=5, pw=13, el='gelo', status=('quebrado', 2), fx={'also': [st('congelado', 1)]}, anim='orb'))
add('hidrocinese', inn('Água obedece: molhado não o atrapalha; dano de água +20%.', elementBoost={'element': 'agua', 'mult': 1.2}),
    sig('Maremoto', 'Ergue uma onda em linha que arrasta todos e molha.', 'magic', 'tile', 'line', 6, 11, el='agua', status=('molhado', 3), fx={'through': True, 'knock': 2}, anim='cone'))
add('geocinese', inn('Terra: ergue cobertura onde estiver (15% menos dano à distância).', reduce={'ranged': 0.15}),
    sig('Muralha de Pedra', 'Ergue um muro de pedra de 3 casas que dura 4 rodadas.', 'utility', 'tile', 'line', 4, 0, mp=7, fx={'build': {'shape': 'wall', 'length': 3, 'height': 2, 'turns': 4}, 'noDamage': True}, anim='nova'))
add('metalocinese', inn('Metal: armaduras inimigas não protegem dele (ignora 30%).', pierce=0.3),
    sig('Espinhos de Metal', 'O metal em volta vira espinhos: dano em área e sangramento.', 'magic', 'tile', 'radius', 5, 11, radius=1, status=('sangramento', 3), anim='nova'))
add('aerocinese', inn('Ventos a favor: voa baixo (ignora terreno difícil).', fly=True),
    sig('Prisão de Vento', 'Prende o alvo num redemoinho no ar: imobilizado e exposto.', 'magic', rng=6, pw=7, el='vento', status=('imobilizado', 2), fx={'also': [st('exposto', 2)]}, anim='orb'))
add('fitocinese', inn('Plantas: regenera 4% por turno perto de grama ou árvores.', regen=0.04),
    sig('Raízes', 'Raízes brotam e prendem todos na área.', 'magic', 'tile', 'radius', 5, 5, el='terra', radius=1, status=('preso', 2), fx={'also': [st('lento', 2)]}, anim='nova'))
add('corrosao', inn('Corrosão: golpes enfraquecem o alvo.', onCastSelf={'status': st('afiado', 1)}),
    sig('Ferrugem', 'Apodrece armas e armaduras: alvo quebrado e desarmado.', 'magic', rng=5, pw=6, el='veneno', status=('quebrado', 3), fx={'also': [st('desarmado', 1)], 'breakItem': True}, anim='orb'))
add('rotacao', inn('Gira: ao ser atacado corpo a corpo, 25% de chance de jogar o atacante longe.', react={'on': 'melee', 'do': 'status', 'chance': 25, 'status': st('confuso', 1)}),
    sig('Pião', 'Faz o alvo girar sem parar: confuso e tonto.', 'magic', rng=5, pw=7, status=('confuso', 2), fx={'also': [st('derrubado', 1)]}, anim='spin'))
add('repulsao', inn('Repulsão: ninguém consegue ficar colado nele (empurra quem chega).', react={'on': 'melee', 'do': 'retreat', 'chance': 35}),
    sig('Explosão Repulsiva', 'Empurra tudo em volta 3 casas.', 'magic', 'self', 'radius', 0, 8, radius=2, fx={'knock': 3}, anim='nova'))
add('atracao', inn('Atração: puxões vão 1 casa mais longe.', shoveBonus=1),
    sig('Atrair Tudo', 'Puxa todos os inimigos numa área grande até ele.', 'magic', 'tile', 'radius', 6, 5, radius=2, fx={'vortex': 3}, status=('lento', 1), anim='nova'))
add('deslize', inn('Desliza: nunca provoca ataque de oportunidade.', noOpportunity=True, moveBonus=1),
    sig('Patinar', 'Desliza até 6 casas golpeando quem passar.', 'physical', 'tile', 'line', 6, 9, fx={'dashThrough': True}, anim='dash'))
add('pressao', inn('Pressão: dano extra contra quem está imobilizado.', vs={'status': 'imobilizado', 'mult': 1.4}),
    sig('Esmagar', 'Aumenta a pressão sobre o alvo: dano alto e imobiliza.', 'magic', rng=5, pw=14, status=('imobilizado', 1), fx={'pierce': 0.5}, anim='orb'))
add('ressonancia', inn('Vibração: destrói cobertura e objetos com facilidade.', demolish=2),
    sig('Ressonância', 'Faz tudo vibrar: quebra paredes e atordoa quem estiver nelas.', 'magic', 'tile', 'radius', 5, 10, radius=1, status=('atordoado', 1), fx={'demolish': 5, 'destroyProps': True}, anim='nova'))
add('peso', inn('Pesa os outros: inimigos atingidos ficam lentos.', onCastSelf={'status': st('afiado', 1)}),
    sig('Tonelada', 'Torna o alvo pesadíssimo: preso no chão e lento.', 'magic', rng=5, pw=6, status=('imobilizado', 2), fx={'also': [st('lento', 3)]}, anim='orb'))
add('adesao', inn('Gruda: imune a ser derrubado e empurrado.', immune=['derrubado']),
    sig('Cola', 'Gruda todos numa área no chão.', 'magic', 'tile', 'radius', 5, 3, radius=1, status=('preso', 2), fx={'noDamage': True}, anim='orb'))
add('vidrocinese', inn('Vidro: golpes deixam ferida aberta.', onCastSelf={'status': st('afiado', 1)}),
    sig('Estilhaços', 'Janelas viram lâminas: cone de vidro que sangra.', 'magic', 'tile', 'cone', 4, 11, status=('sangramento', 3), fx={'also': [st('ferida_aberta', 2)]}, anim='cone'))
add('areia', inn('Areia: começa escondido em terreno de areia; imune a cegar.', immune=['cegado'], hide='sand'),
    sig('Tempestade de Areia', 'Tempestade em área: cega todos e esconde aliados.', 'magic', 'tile', 'radius', 5, 6, el='terra', radius=2, status=('cegado', 2), fx={'cloud': 'fumaca'}, anim='smoke'))
add('correntes', inn('Correntes elétricas: imune a eletrocutar.', immune=['eletrocutado']),
    sig('Curto-circuito', 'Desvia a energia de tudo em volta para o alvo.', 'magic', rng=6, pw=13, el='eletricidade', status=('atordoado', 1), fx={'chain': 2}, anim='bolt'))
add('hemocinese', inn('Sangue: rouba 15% do dano como vida.', lifesteal=0.15),
    sig('Sangria', 'Puxa o sangue do alvo: dano, sangramento e cura a si mesmo.', 'magic', rng=5, pw=13, status=('sangramento', 3), fx={'lifesteal': 0.6}, anim='beam'))
add('fios', inn('Fios: puxa armas e objetos (ataca de mais longe, +1).', reachBonus=1),
    sig('Teia de Cabos', 'Cabos prendem até 3 inimigos ao mesmo tempo.', 'magic', 'tile', 'radius', 6, 4, radius=1, status=('preso', 2), fx={'pull': 1}, anim='orb'))
add('equilibrio', inn('Equilíbrio perfeito: nunca cai (imune a derrubar).', immune=['derrubado']),
    sig('Tropeço Coletivo', 'Todo inimigo numa área grande cai.', 'magic', 'tile', 'radius', 6, 2, radius=2, status=('derrubado', 2), fx={'noDamage': True}, anim='nova'))
add('eletromagnetismo', inn('Campo EM: segura balas no ar (30% menos dano à distância).', reduce={'ranged': 0.3}),
    sig('Devolver Balas', 'Segura todas as balas e devolve: dano em todos os inimigos à vista.', 'magic', rng=8, pw=9, el='eletricidade', fx={'randomTargets': 99}, anim='volley'))
add('ondas', inn('Ondas no chão: empurrões derrubam.', shoveBonus=1),
    sig('Onda Terrestre', 'O chão ondula em linha: derruba todos e empurra.', 'magic', 'tile', 'line', 6, 9, el='agua', status=('derrubado', 1), fx={'through': True, 'knock': 1}, anim='cone'))
add('calor_objetos', inn('Esquenta armas: quem o ataca corpo a corpo se queima.', react={'on': 'melee', 'do': 'status', 'status': st('queimando', 2)}),
    sig('Brasa nas Mãos', 'Esquenta as armas dos inimigos na área: queimam e soltam.', 'magic', 'tile', 'radius', 5, 7, el='fogo', radius=1, status=('desarmado', 1), fx={'also': [st('queimando', 2)]}, anim='orb'))

# ───────────────────────────── Criadores ─────────────────────────────
add('barreira', inn('Barreiras: aliados ao lado recebem 15% menos dano.', aura={'radius': 1, 'allies': True, 'status': st('protegido', 1)}),
    sig('Barreira Total', 'Escudo de 35% da vida em todos os aliados numa área.', 'buff', 'tile', 'radius', 5, 0, radius=2, fx={'shield': 0.35}, anim='buff'))
add('forja', inn('Armas forjadas: +15% de dano físico.', physBoost=0.15),
    sig('Forjar Arma', 'Forja uma arma melhor na hora: afiado e +dano por 3 turnos.', 'buff', 'ally', rng=3, pw=0, mp=7, fx={'imbue': {'turns': 3, 'bonus': 0.3}, 'self': st('afiado', 1)}, anim='buff'))
add('plataformas', inn('Plataformas: sobe em qualquer lugar (escala paredes).', climb=True),
    sig('Escadaria', 'Ergue uma rampa de plataformas para subir e atirar do alto.', 'utility', 'tile', 'line', 4, 0, mp=6, fx={'build': {'shape': 'ramp', 'height': 3, 'turns': 4}, 'noDamage': True}, anim='nova'))
add('correntes_criadas', inn('Correntes: puxa inimigos 1 casa ao acertar.', shoveBonus=1),
    sig('Laço de Corrente', 'Prende o alvo e o puxa até ele.', 'physical', rng=6, pw=8, status=('preso', 1), fx={'pull': 5, 'grab': True}, anim='thrust'))
add('concreto', inn('Concreto: 15% menos dano físico.', reduce={'physical': 0.15}),
    sig('Bunker', 'Ergue um bunker de concreto: barricada que dura a luta inteira.', 'utility', 'tile', 'line', 3, 0, mp=7, fx={'build': {'shape': 'barricade', 'length': 3, 'height': 2, 'turns': 99}, 'noDamage': True}, anim='nova'))
add('espinhos', inn('Espinhos: quem o ataca corpo a corpo se fere.', react={'on': 'melee', 'do': 'status', 'status': st('sangramento', 2), 'damage': 5}),
    sig('Campo de Espinhos', 'Espinhos brotam numa área: dano e quem andar por ali sangra.', 'physical', 'tile', 'radius', 5, 8, radius=1, status=('sangramento', 3), fx={'trap': {'status': st('sangramento', 2), 'damage': 6, 'count': 3}}, anim='trap'))
add('cordas', inn('Cordas: imune a cair de altura (tirolesa).', climb=True),
    sig('Rede', 'Uma rede de cordas prende todos numa área.', 'physical', 'tile', 'radius', 5, 3, radius=1, status=('preso', 2), fx={'noDamage': True}, anim='orb'))
add('clones', inn('Clones: começa a luta com cópias que confundem os tiros.', onCastSelf={'status': st('duplicatas', 1)}),
    sig('Exército de Um', 'Cria clones: duplicatas por 3 turnos e uma ação extra.', 'buff', 'self', rng=0, pw=0, mp=10, cd=5, st=45, fx={'self': st('duplicatas', 3), 'extraTurn': True}, anim='summon'))
add('bonecos', inn('Bonecos: inimigos atiram nos bonecos (15% menos dano à distância).', reduce={'ranged': 0.15}),
    sig('Isca', 'Um boneco perfeito: inimigos numa área ficam provocados e erram.', 'utility', 'tile', 'radius', 6, 0, radius=2, status=('provocado', 2), fx={'noDamage': True}, anim='summon'))
add('torres', inn('Torres: +10 de precisão do alto (parado).', steadyAim=10),
    sig('Torre de Vigia', 'Ergue uma torre de 3 andares para subir e atirar.', 'utility', 'tile', 'single', 3, 0, mp=7, fx={'build': {'shape': 'pillar', 'height': 4, 'turns': 99}, 'noDamage': True}, anim='nova'))
add('escudos_luz', inn('Escudos de luz: ao atacar, dá escudo ao aliado mais próximo.', allyShield=0.08),
    sig('Égide', 'Escudo de luz forte num aliado e o deixa refletindo golpes.', 'buff', 'ally', rng=5, pw=0, mp=8, el='luz', fx={'shield': 0.5, 'also': [st('refletindo', 2)]}, anim='buff'))
add('bolhas', inn('Bolhas: amortecem a queda e o primeiro golpe de cada luta.', ignoreOnce='physical'),
    sig('Bolha-Prisão', 'Prende o alvo numa bolha: fora da luta por 2 turnos (sem dano).', 'magic', rng=5, pw=0, el='agua', status=('aprisionado', 2), fx={'noDamage': True}, anim='orb'))
add('armadilhas_dom', inn('Armadilheiro: armadilhas do campo de batalha.', fieldTraps=True),
    sig('Minas Invisíveis', 'Planta 3 armadilhas invisíveis que imobilizam e ferem.', 'utility', 'tile', 'radius', 5, 0, radius=1, fx={'trap': {'status': st('imobilizado', 2), 'damage': 10, 'count': 3}}, anim='trap'))
add('granadas_bio', inn('Frutos: ao cair, explode em gás.', deathBurst={'radius': 1, 'power': 8, 'element': 'veneno'}),
    sig('Fruto de Duas Faces', 'Lança um fruto: envenena inimigos e cura aliados na área.', 'magic', 'tile', 'radius', 5, 9, el='veneno', radius=1, status=('envenenado', 3), fx={'healPct': 0.15, 'spareAllies': True}, anim='orb'))
add('gelo_estrutural', inn('Gelo: imune a congelar; anda no gelo sem escorregar.', immune=['congelado', 'derrubado']),
    sig('Muralha de Gelo', 'Ergue uma muralha de gelo de 4 casas.', 'utility', 'tile', 'line', 4, 0, mp=7, el='gelo', fx={'build': {'shape': 'wall', 'terrain': 'gelo', 'length': 4, 'height': 2, 'turns': 3}, 'noDamage': True}, anim='nova'))
add('pontes', inn('Pontes: atravessa vãos e água.', iceBridge=True, moveBonus=1),
    sig('Passarela', 'Cria uma passarela até um telhado: o esquadrão sobe.', 'utility', 'tile', 'line', 5, 0, mp=6, fx={'build': {'shape': 'ramp', 'height': 4, 'turns': 99}, 'noDamage': True}, anim='nova'))
add('cupula', inn('Cúpula: aliados ao lado recebem 10% menos dano.', aura={'radius': 1, 'allies': True, 'status': st('protegido', 1)}),
    sig('Cúpula', 'Cobre a área: aliados dentro ficam invulneráveis por 1 turno.', 'buff', 'self', 'radius', 0, 0, radius=2, mp=12, cd=5, st=50, fx={'also': [st('invulneravel', 1)]}, anim='buff'))
add('papel', inn('Papel: cortes rápidos (+5% de crítico).', critBonus=5),
    sig('Mil Grous', 'Mil dobraduras de papel cortam 4 alvos aleatórios.', 'physical', rng=6, pw=7, status=('sangramento', 2), fx={'randomTargets': 4}, anim='volley'))
add('espelhos', inn('Espelhos: devolvem 30% dos tiros e da luz.', react={'on': 'ranged', 'do': 'reflect', 'chance': 30}),
    sig('Sala de Espelhos', 'Espelhos em volta de um aliado: reflete tudo por 2 turnos.', 'buff', 'ally', rng=5, pw=0, el='luz', fx={'also': [st('refletindo', 2)]}, anim='buff'))
add('laminas', inn('Lâminas flutuantes: ataca quem chega perto.', pursuit=True),
    sig('Ciclone de Lâminas', 'As lâminas giram em volta: dano em todos ao lado.', 'physical', 'self', 'radius', 0, 10, radius=1, status=('sangramento', 2), anim='spin'))
add('balas', inn('Munição viva: nunca fica sem balas (pente infinito).', reachBonus=1),
    sig('Rajada Viva', 'Gasta a própria vida em balas: 5 tiros no alvo.', 'ranged', rng=7, pw=4, fx={'hits': 5, 'self': st('sangramento', 1)}, anim='volley'))
add('ferramentas', inn('Ferramentas: itens de campo têm efeito melhor.', healBoost=0.1),
    sig('A Ferramenta Certa', 'Conserta e reforça um aliado: cura 25% e fortifica.', 'heal', 'ally', rng=3, pw=0, fx={'healPct': 0.25, 'also': [st('fortificado', 2)]}, anim='heal'))
add('remedio', inn('Remédios: curas 20% mais fortes e removem um veneno.', healBoost=0.2),
    sig('Antídoto Universal', 'Cura e limpa todos os aliados numa área.', 'heal', 'tile', 'radius', 4, 10, radius=1, fx={'cleanse': True, 'healPct': 0.1}, anim='heal'))
add('teia', inn('Teia: anda em paredes e não fica preso.', climb=True, immune=['preso']),
    sig('Teia Gigante', 'Uma teia grande prende todos numa área.', 'physical', 'tile', 'radius', 5, 3, radius=2, status=('preso', 2), fx={'noDamage': True}, anim='orb'))
add('muro_terra', inn('Muro: sempre tem cobertura por perto (10% menos dano à distância).', reduce={'ranged': 0.1}),
    sig('Muro de Terra', 'Ergue um muro de terra de 3 casas.', 'utility', 'tile', 'line', 4, 0, mp=6, el='terra', fx={'build': {'shape': 'wall', 'length': 3, 'height': 2, 'turns': 4}, 'noDamage': True}, anim='nova'))
add('holograma', inn('Ilusões: 12% de chance de o golpe acertar uma ilusão.', react={'on': 'any', 'do': 'dodge', 'chance': 12}),
    sig('Esquadrão Fantasma', 'Ilusões de todo o esquadrão: inimigos numa área se confundem.', 'magic', 'tile', 'radius', 6, 0, el='luz', radius=2, status=('confuso', 2), fx={'noDamage': True}, anim='blink'))
add('abrigo', inn('Abrigo: começa a luta fortificado.', reduce={'physical': 0.1, 'ranged': 0.1}),
    sig('Trincheira', 'Cava uma trincheira: aliados numa área ficam fortificados.', 'buff', 'tile', 'radius', 3, 0, radius=1, fx={'also': [st('fortificado', 3)]}, anim='buff'))

# ───────────────────────────── Sensoriais ─────────────────────────────
add('eco', inn('Ouve tudo: vê inimigos escondidos.', seeHidden=True),
    sig('Grito de Canhão', 'Grito concentrado em linha que atordoa todos.', 'magic', 'tile', 'line', 7, 10, el='vento', status=('atordoado', 1), fx={'through': True}, anim='shout'))
add('rastro', inn('Rastreador: +15% de dano contra o alvo marcado.', vs={'status': 'marcado', 'mult': 1.15}),
    sig('Marca de Caça', 'Marca o alvo: ninguém do esquadrão erra contra ele por 3 turnos.', 'utility', rng=10, pw=0, status=('marcado', 3), fx={'noDamage': True, 'also': [st('exposto', 3)]}, anim='arrow'))
add('raio_x', inn('Vê através: ataques ignoram cobertura.', homing=True),
    sig('Ponto Exato', 'Atira através da parede no órgão certo: crítico garantido.', 'ranged', rng=8, pw=11, fx={'homing': True, 'crit': 100}, anim='arrow'))
add('visao_termica', inn('Calor dos corpos: vê escondidos e no escuro.', seeHidden=True, steadyAim=5),
    sig('Alvo Quente', 'Marca todos os inimigos à vista: expostos por 2 turnos.', 'utility', rng=10, pw=0, fx={'randomTargets': 99, 'noDamage': True, 'also': [st('exposto', 2)]}, anim='arrow'))
add('precognicao', inn('Vê o futuro: 25% de chance de esquivar qualquer golpe.', react={'on': 'any', 'do': 'dodge', 'chance': 25}),
    sig('Já Vi Isso', 'Vê o próximo golpe: esquiva garantida e contra-ataque por 2 turnos.', 'buff', 'self', rng=0, pw=0, mp=8, cd=4, st=35, fx={'self': st('preparado', 2)}, anim='buff'))
add('leitura_movimento', inn('Lê o corpo: contra-ataca 25% dos golpes corpo a corpo.', react={'on': 'melee', 'do': 'counter', 'chance': 25}),
    sig('Contra-golpe', 'Lê e devolve: golpe que derruba e deixa o alvo vulnerável.', 'physical', rng=1, pw=11, status=('derrubado', 1), fx={'also': [st('vulneravel', 2)]}, anim='slash'))
add('audicao', inn('Ouvido absoluto: ninguém o surpreende.', noSurprise=True, seeHidden=True),
    sig('Batimento', 'Ouve o coração do alvo: acerta o momento exato (crítico +50%).', 'physical', rng=6, pw=11, fx={'crit': 50, 'homing': True}, anim='arrow'))
add('olfato', inn('Fareja sangue: +15% de dano contra quem sangra.', vs={'status': 'sangramento', 'mult': 1.15}, bloodSense=True),
    sig('Faro de Medo', 'Fareja o medo: o alvo fica com medo e foge.', 'magic', rng=5, pw=4, status=('medo', 2), fx={'noDamage': True}, anim='orb'))
add('radar', inn('Radar: vê tudo num raio grande; ninguém o surpreende.', seeHidden=True, noSurprise=True),
    sig('Varredura', 'Revela toda a área e deixa os inimigos expostos.', 'utility', 'self', 'radius', 0, 0, radius=4, fx={'reveal': True, 'also': [st('exposto', 2)]}, anim='nova'))
add('visao_distante', inn('Binóculos nos olhos: +3 de alcance no ataque básico.', reachBonus=3),
    sig('Olho de Longe', 'Tiro do outro lado do mapa, ignorando cobertura.', 'ranged', rng=14, pw=11, fx={'homing': True}, anim='arrow'))
add('ponto_fraco', inn('Vê a falha: crítico garantido em quem tem 2 estados negativos.', critIfDebuffs=2),
    sig('Golpe na Falha', 'Acerta o ponto fraco: ignora a defesa e quebra a armadura.', 'physical', rng=1, pw=13, status=('quebrado', 3), fx={'pierce': 1}, anim='thrust'))
add('empatia', inn('Sente os aliados: curas que recebe são 15% mais fortes; aliados ao lado inspirados.', aura={'radius': 1, 'allies': True, 'status': st('inspirado', 1)}),
    sig('Acalmar', 'Acalma os inimigos numa área: param de atacar (encantados).', 'magic', 'tile', 'radius', 5, 0, radius=1, status=('encantado', 1), fx={'noDamage': True}, anim='heal'))
add('telepatia', inn('Telepatia: o esquadrão age coordenado (aliados ao lado acertam mais).', aura={'radius': 2, 'allies': True, 'status': st('afiado', 1)}),
    sig('Ordem Mental', 'Fala na cabeça do alvo: ele ataca os próprios aliados.', 'magic', rng=6, pw=0, status=('confuso', 3), fx={'noDamage': True}, anim='orb'))
add('detector', inn('Sente Dons: técnicas de Dom inimigas custam mais perto dele (aura silencia às vezes).', aura={'radius': 1, 'status': {'id': 'silenciado', 'turns': 1, 'chance': 25}}),
    sig('Interferência', 'Atrapalha o Dom do alvo: silenciado e Stamina drenada.', 'magic', rng=6, pw=4, status=('silenciado', 3), fx={'mpBurn': 15}, anim='orb'))
add('sentido_perigo', inn('Arrepio: 20% de chance de esquivar e nunca é surpreendido.', react={'on': 'any', 'do': 'dodge', 'chance': 20}, noSurprise=True),
    sig('Alerta Geral', 'Avisa o esquadrão: todos numa área ganham esquiva (preparados).', 'buff', 'self', 'radius', 0, 0, radius=3, fx={'also': [st('preparado', 1)]}, anim='shout'))
add('mapa_mental', inn('Memória do terreno: +1 de deslocamento e sem terreno difícil.', moveBonus=1),
    sig('Rota Perfeita', 'Mostra o caminho: um aliado ganha um movimento extra agora.', 'buff', 'ally', rng=6, pw=0, mp=6, fx={'gaugeShift': True}, anim='buff'))
add('analise', inn('Analisa: +10% de dano contra o inimigo mais ferido.', vsWeakest=0.1),
    sig('Diagnóstico', 'Analisa o alvo: vulnerável e exposto para todos.', 'utility', rng=8, pw=0, status=('vulneravel', 3), fx={'noDamage': True, 'also': [st('exposto', 3)]}, anim='arrow'))
add('sincronia', inn('Mente ligada: +10% de dano com aliado ao lado do alvo.', flank=0.1),
    sig('Mente Única', 'Liga-se a um aliado: o aliado age agora.', 'buff', 'ally', rng=6, pw=0, mp=8, cd=4, st=40, fx={'gaugeShift': True}, anim='buff'))
add('ecolocalizacao', inn('Estalos: vê escondidos e não erra no escuro.', seeHidden=True),
    sig('Estalo Atordoante', 'Estalo em cone: atordoa e revela.', 'magic', 'tile', 'cone', 4, 6, el='vento', status=('atordoado', 1), fx={'reveal': True}, anim='shout'))
add('leitura_intencao', inn('Sabe o que vem: 30% de chance de esquivar de humanos.', react={'on': 'any', 'do': 'dodge', 'chance': 20}),
    sig('Antecipar', 'Atrapalha o plano do alvo: a barra dele vai a zero.', 'magic', rng=6, pw=3, fx={'gaugeShift': True}, status=('lento', 1), anim='orb'))
add('marcador', inn('Marcas: alvos que acerta ficam marcados para o esquadrão.', vs={'status': 'marcado', 'mult': 1.1}),
    sig('Marcar Todos', 'Marca todos os inimigos numa área grande.', 'utility', 'tile', 'radius', 8, 0, radius=2, status=('marcado', 3), fx={'noDamage': True}, anim='arrow'))
add('visao_360', inn('Vê tudo: não pode ser flanqueado nem atacado pelas costas.', frontGuard=0.15, noSurprise=True),
    sig('Olhos em Tudo', 'Aliados numa área não podem ser surpreendidos e ficam preparados.', 'buff', 'self', 'radius', 0, 0, radius=2, fx={'also': [st('preparado', 1)]}, anim='buff'))
add('tato_sismico', inn('Sente passos: vê inimigos escondidos que estão no chão.', seeHidden=True),
    sig('Pulso Sísmico', 'Bate no chão: todos os inimigos que pisam ficam expostos e derrubados.', 'magic', 'self', 'radius', 0, 5, el='terra', radius=3, status=('derrubado', 1), fx={'also': [st('exposto', 2)]}, anim='nova'))
add('calculo_balistico', inn('Trajetórias perfeitas: tiros ignoram cobertura.', homing=True, steadyAim=5),
    sig('Tiro em Curva', 'Tiro que faz curva e ricocheteia em 2 inimigos.', 'ranged', rng=9, pw=11, fx={'homing': True, 'chain': 2, 'chainMult': 0.8}, anim='arrow'))
add('hipercognicao', inn('Pensa rápido: a barra de ação enche 15% mais rápido.', haste=0.15),
    sig('Mil Pensamentos', 'Pensa tão rápido que age de novo agora e reduz recargas.', 'buff', 'self', rng=0, pw=0, mp=10, cd=5, st=50, fx={'extraTurn': True, 'reduceCooldowns': 1}, anim='buff'))

# ───────────────────────────── Anômalos ─────────────────────────────
add('troca', inn('Troca: quando um aliado ao lado é atacado, às vezes troca de lugar com ele.', intercept={'radius': 1, 'pct': 0.2}),
    sig('Troca Forçada', 'Troca de lugar com um inimigo e o deixa confuso.', 'utility', rng=7, pw=0, status=('confuso', 1), fx={'swap': True, 'noDamage': True}, anim='blink'))
add('pausa', inn('Tempo parado: imune a lentidão.', immune=['lento']),
    sig('Pausa', 'Para o tempo do alvo: barra de ação a zero e congelado no lugar.', 'magic', rng=7, pw=0, mp=14, cd=5, st=55, status=('imobilizado', 2), fx={'gaugeShift': True, 'noDamage': True, 'also': [st('sem_reacao', 2)]}, anim='blink'))
add('teletransporte', inn('Teleporte: nunca provoca ataque de oportunidade.', noOpportunity=True),
    sig('Salto Espacial', 'Teletransporta para qualquer lugar à vista e golpeia quem estiver ao lado.', 'physical', 'tile', 'single', 8, 9, fx={'teleport': True, 'burstAround': {'radius': 1, 'power': 9, 'around': 'self'}}, anim='blink'))
add('duplicacao', inn('Dividido: começa a luta com uma duplicata.', onCastSelf={'status': st('duplicatas', 1)}),
    sig('Dois de Mim', 'Divide-se em dois: duplicatas e ação extra.', 'buff', 'self', rng=0, pw=0, mp=10, cd=5, st=45, fx={'self': st('duplicatas', 3), 'extraTurn': True}, anim='summon'))
add('intangibilidade', inn('Intangível às vezes: 20% de chance de golpes físicos atravessarem.', react={'on': 'physical', 'do': 'negate', 'chance': 20}),
    sig('Atravessar', 'Fica intangível por 2 turnos e atravessa paredes.', 'buff', 'self', rng=0, pw=0, mp=9, cd=4, st=40, fx={'self': st('intangivel', 2)}, anim='blink'))
add('sorte', inn('Sorte: +10% de crítico e +8 de esquiva.', critBonus=10, evasion=8),
    sig('Golpe de Sorte', 'Tudo dá certo: crítico garantido, e se derrubar, recarrega as técnicas.', 'physical', rng=5, pw=12, fx={'crit': 100}, anim='slash'))
add('reversao', inn('Reverte: uma vez por luta, volta de um golpe fatal com 1 de vida.', cheatDeath=True),
    sig('Voltar no Tempo', 'Volta um aliado para onde estava e desfaz as feridas recentes.', 'heal', 'ally', rng=6, pw=0, mp=12, cd=5, st=50, fx={'rewind': True, 'healPct': 0.4, 'cleanse': True}, anim='blink'))
add('copia', inn('Cópia: técnicas custam 10% menos.', mpDiscount={'pct': 0.1}),
    sig('Toque Copiador', 'Toca o alvo, rouba os reforços dele (invertidos) e drena a Stamina.', 'magic', rng=1, pw=7, fx={'invertBuffs': True, 'mpBurn': 15, 'lifesteal': 0.3}, anim='claw'))
add('anulacao', inn('Olhar anulador: inimigos ao lado têm o Dom silenciado às vezes.', aura={'radius': 1, 'status': {'id': 'silenciado', 'turns': 1, 'chance': 35}}),
    sig('Apagar o Dom', 'Apaga o Dom do alvo: silenciado, sem reforços e Stamina máxima cortada.', 'magic', rng=6, pw=0, mp=12, cd=5, st=50, status=('silenciado', 3), fx={'dispel': True, 'maxMpCut': 0.5, 'noDamage': True}, anim='beam'))
add('probabilidade', inn('Mexe nas chances: inimigos erram mais (+10 de esquiva).', evasion=10),
    sig('Azar', 'O alvo fica com todo o azar: vulnerável, exposto e cai.', 'magic', rng=6, pw=0, status=('vulneravel', 3), fx={'noDamage': True, 'also': [st('derrubado', 1), st('exposto', 3)]}, anim='orb'))
add('portais', inn('Portais: anda pelo campo sem provocar ataques e +2 de deslocamento.', noOpportunity=True, moveBonus=2),
    sig('Portal', 'Abre um portal: um aliado troca de lugar com ele.', 'utility', 'ally', rng=10, pw=0, fx={'swap': True, 'noDamage': True}, anim='blink'))
add('espaco', inn('Espaço comprimido: ataque básico alcança +2.', reachBonus=2),
    sig('Compressão', 'Encolhe o espaço: puxa todos numa área grande para o centro e os prende.', 'magic', 'tile', 'radius', 7, 8, radius=3, status=('imobilizado', 1), fx={'vortex': 3}, anim='nova'))
add('inversao', inn('Inversão: às vezes um golpe recebido vira cura.', absorb=['sombra']),
    sig('Inverter', 'Inverte o alvo: reforços viram penalidades e cura vira dano.', 'magic', rng=6, pw=8, fx={'invertBuffs': True}, status=('confuso', 1), anim='orb'))
add('vinculo_dor', inn('Dor compartilhada: rouba 10% do dano causado como vida.', lifesteal=0.1),
    sig('Laço de Dor', 'Liga a dor de 2 inimigos: dano em um fere o outro.', 'magic', rng=6, pw=6, el='sombra', fx={'link': 2}, status=('condenado', 2), anim='beam'))
add('sono', inn('Toque do sono: imune a sono.', immune=['sono']),
    sig('Toque do Sono', 'Encosta e o alvo dorme profundamente.', 'magic', rng=1, pw=0, status=('sono', 4), fx={'noDamage': True}, anim='claw'))
add('memoria', inn('Apaga lembranças: inimigos que o atacam esquecem às vezes (perdem a vez).', react={'on': 'any', 'do': 'status', 'chance': 20, 'status': st('confuso', 1)}),
    sig('Esquecer', 'O alvo esquece o que ia fazer: perde a vez e as recargas reiniciam.', 'magic', rng=6, pw=0, status=('atordoado', 1), fx={'gaugeShift': True, 'noDamage': True}, anim='orb'))
add('sombra_viva', inn('Sombra viva: ataca junto quem ele atacar (+10% de dano).', physBoost=0.1, magicBoost=0.1),
    sig('Sombra Assassina', 'A sombra ataca o alvo pelas costas 3 vezes.', 'magic', rng=6, pw=5, el='sombra', fx={'hits': 3, 'backstab': 0.3}, status=('cegado', 1), anim='claw'))
add('gravidade_zero', inn('Flutua: voa sobre terreno e altura.', fly=True),
    sig('Gravidade Zero', 'Desliga a gravidade numa área: todos flutuam indefesos (expostos e sem alcance).', 'magic', 'tile', 'radius', 6, 4, radius=2, status=('exposto', 2), fx={'also': [st('sem_alcance', 1), st('voando', 2)]}, anim='nova'))
add('espelho_dom', inn('Espelho: devolve 40% do dano das técnicas de Dom recebidas.', react={'on': 'magic', 'do': 'reflect', 'chance': 40}),
    sig('Devolver o Dom', 'Fica refletindo tudo por 3 turnos.', 'buff', 'self', rng=0, pw=0, mp=10, cd=5, st=45, fx={'self': st('refletindo', 3)}, anim='buff'))
add('distorcao', inn('Distorção: 15% de chance de qualquer golpe errar (nada está onde parece).', react={'on': 'any', 'do': 'dodge', 'chance': 15}),
    sig('Miragem', 'Distorce a área: inimigos confusos e cegos.', 'magic', 'tile', 'radius', 6, 0, radius=2, status=('confuso', 2), fx={'noDamage': True, 'also': [st('cegado', 1)]}, anim='blink'))
add('atraso', inn('Toque lento: inimigos que acerta ficam lentos.', onCastSelf={'status': st('afiado', 1)}),
    sig('Câmera Lenta', 'Atrasa o tempo de todos numa área: lentos e barras para trás.', 'magic', 'tile', 'radius', 6, 3, radius=2, status=('lento', 3), fx={'gaugeShift': True}, anim='nova'))
add('aceleracao', inn('Tempo acelerado: a barra de ação enche 25% mais rápido.', haste=0.25),
    sig('Acelerar', 'Acelera o próprio tempo: ação extra agora e veloz por 3 turnos.', 'buff', 'self', rng=0, pw=0, mp=12, cd=5, st=55, fx={'extraTurn': True, 'self': st('veloz', 3)}, anim='buff'))
add('desmaterializar', inn('Desmancha: golpes ignoram 30% da defesa.', pierce=0.3),
    sig('Desmanchar', 'Desmancha a matéria do alvo: dano igual a 35% da vida atual e destrói o que estiver no caminho.', 'magic', rng=4, pw=8, el='sombra', fx={'currentHpPct': 0.35, 'pierce': 1, 'destroyProps': True}, anim='beam'))


if __name__ == '__main__':
    out = os.path.join(os.path.dirname(__file__), '..', 'src', 'game', 'data', 'gifts', 'signatures.json')
    data = {'_doc': 'Gerado por tools/gen_signatures.py: passiva inata com efeito e técnica-assinatura de cada Dom (o que o torna único).', 'gifts': S}
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print(len(S), 'Dons com assinatura')
