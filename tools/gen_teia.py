#!/usr/bin/env python3
"""
Gera as árvores do Mundo Pós-Cubo:
- src/game/data/skills/trees/teia.json — teia única das classes (Impacto, Movimento, Suporte,
  Controle): 4 núcleos (passiva inata de cada classe), 16 subclasses (4 técnicas cada) e 8 fusões
  nas diagonais (3 técnicas cada, cada uma com uma regra nova).
- src/game/data/skills/trees/armas.json — árvore de armas estilo XCOM (Sniper, Assalto, Pesado,
  Especialista).

Desenho em docs/design/classes_armas.md. Rodar: python3 tools/gen_teia.py
"""
import json
import os

ROOT = os.path.join(os.path.dirname(__file__), '..', 'src', 'game', 'data', 'skills', 'trees')


def sk(id, name, desc, kind='physical', range=1, power=0, cd=0, mp=0, lv=1, **kw):
    s = {'id': id, 'name': name, 'description': desc, 'kind': kind, 'range': range, 'power': power, 'cooldown': cd, 'mp': mp, 'levelReq': lv}
    for k, v in kw.items():
        if v is not None:
            s[k] = v
    return s


def passive(id, name, desc, fx, lv=1):
    return sk(id, name, desc, kind='passive', range=0, lv=lv, fx=fx)


def node(id, name, type, x, y, desc, skills, group=None, parents=None, short=None, unlockAt=None):
    n = {'id': id, 'name': name, 'type': type, 'parents': parents or [], 'x': x, 'y': y, 'description': desc, 'skills': skills}
    if group:
        n['group'] = group
    if short:
        n['short'] = short
    if unlockAt:
        n['unlockAt'] = unlockAt
    return n


W = -1  # alcance da arma

TEIA = [
    # ── núcleos: passiva inata da classe ──
    node('nucleo_impacto', 'Núcleo: Impacto', 'base', 0, -110, 'Lutar para derrubar: dano direto, quebrar cobertura, arremessar.', [
        passive('impacto_inato', 'Instinto de Impacto', 'Recebe 10% menos dano físico.', {'reduce': {'physical': 0.1}}),
    ], group='impacto'),
    node('nucleo_movimento', 'Núcleo: Movimento', 'base', 110, 0, 'Lutar em movimento: velocidade, flanco, nunca parado.', [
        passive('movimento_inato', 'Instinto de Movimento', '+1 de deslocamento.', {'moveBonus': 1}),
    ], group='movimento'),
    node('nucleo_suporte', 'Núcleo: Suporte', 'base', 0, 110, 'Lutar pelos outros: curar, proteger, comandar, resgatar.', [
        passive('suporte_inato', 'Instinto de Suporte', 'Aliados ao lado ficam afiados (+acerto).', {'aura': {'radius': 1, 'allies': True, 'status': {'id': 'afiado', 'turns': 1}}}),
    ], group='suporte'),
    node('nucleo_controle', 'Núcleo: Controle', 'base', -110, 0, 'Lutar pelo campo: prender, empurrar, negar espaço.', [
        passive('controle_inato', 'Instinto de Controle', 'Esquiva 8% a mais.', {'evasion': 8}),
    ], group='controle'),

    # ── IMPACTO (N) ──
    node('demolidor', 'Demolidor', 'evolucao', 120, -260, 'Dano bruto corpo a corpo; destrói cobertura e paredes.', [
        sk('demolidor_soco', 'Soco Demolidor', 'Golpe que arremessa o alvo 2 casas (contra parede ou alguém: dano extra).', power=8, mp=4, fx={'push': 2}, anim='charge'),
        sk('demolidor_parede', 'Derrubar Parede', 'Destrói obstáculos e cobertura na casa ao lado (e fere quem estiver atrás).', kind='physical', range=1, power=6, cd=1, mp=4, target='tile', fx={'destroyProps': True}, anim='charge', lv=2),
        passive('demolidor_peso', 'Peso Pesado', 'Recebe 15% menos dano corpo a corpo e não é derrubado.', {'reduce': {'melee': 0.15}, 'immune': ['derrubado']}, lv=4),
        sk('demolidor_terremoto', 'Terremoto', 'Soca o chão: dano e derruba todos a até 1 casa (aliados também).', power=7, cd=3, mp=8, target='self', shape='radius', radius=1, status={'id': 'derrubado', 'turns': 1}, anim='nova', lv=7),
    ], group='impacto', short='Demolidor'),
    node('artilheiro', 'Artilheiro', 'evolucao', 270, -200, 'Dano à distância em área; explosões.', [
        sk('artilheiro_granada', 'Granada de Fragmentação', 'Explosão 3×3 a até 6 casas; derruba cobertura leve.', kind='ranged', range=6, power=6, cd=2, mp=5, target='tile', shape='radius', radius=1, fx={'destroyProps': True}, anim='orb'),
        passive('artilheiro_mira', 'Mão Firme', 'O tiro básico alcança 1 casa a mais.', {'reachBonus': 1}, lv=2),
        sk('artilheiro_supressao', 'Fogo Supressivo', 'Prende o alvo sob fogo: se ele sair do lugar, leva outro tiro.', kind='ranged', range=W, power=3, cd=1, mp=4, fx={'suppress': True}, anim='volley', lv=4),
        sk('artilheiro_bombardeio', 'Bombardeio', 'Explosão 5×5 a até 7 casas.', kind='ranged', range=7, power=7, cd=4, mp=10, target='tile', shape='radius', radius=2, fx={'destroyProps': True}, anim='meteor', lv=7),
    ], group='impacto', short='Artilheiro'),
    node('duelista', 'Duelista', 'evolucao', -120, -260, 'Um contra um; golpes rápidos e precisos.', [
        sk('duelista_estocada', 'Estocada Rápida', 'Golpe com +15% de crítico.', power=6, mp=3, fx={'crit': 15}, anim='thrust'),
        passive('duelista_guarda', 'Guarda Alta', 'Esquiva 12% a mais.', {'evasion': 12}, lv=2),
        sk('duelista_duplo', 'Golpe Duplo', 'Dois golpes seguidos.', power=4, cd=1, mp=5, fx={'hits': 2}, anim='slash', lv=4),
        sk('duelista_desafio', 'Desafio', 'Provoca o alvo: ele só consegue atacar o Duelista por 2 turnos.', kind='utility', range=5, cd=3, mp=5, target='enemy', status={'id': 'provocado', 'turns': 2}, anim='shout', lv=7),
    ], group='impacto', short='Duelista'),
    node('cacador', 'Caçador', 'evolucao', -270, -200, 'Finaliza alvos feridos, marcados ou presos.', [
        sk('cacador_marcar', 'Marcar Presa', 'Marca o alvo por 3 turnos (todo o esquadrão acerta melhor).', kind='utility', range=9, cd=1, mp=2, target='enemy', status={'id': 'marcado', 'turns': 3}, apCost=1, anim='arrow'),
        sk('cacador_misericordia', 'Golpe de Misericórdia', 'Derruba na hora alvos abaixo de 25% da vida.', kind='ranged', range=W, power=6, cd=2, mp=5, fx={'execute': 0.25}, anim='arrow', lv=2),
        passive('cacador_rastro', 'Rastreio', 'Enxerga inimigos escondidos.', {'seeHidden': True}, lv=4),
        sk('cacador_abate', 'Abate', 'Tiro devastador: +50% de dano em alvos marcados e +20% de crítico.', kind='ranged', range=W, power=9, cd=3, mp=8, fx={'vs': {'status': 'marcado', 'mult': 1.5}, 'crit': 20}, anim='arrow', lv=7),
    ], group='impacto', short='Caçador'),

    # ── MOVIMENTO (L) ──
    node('corredor', 'Corredor', 'evolucao', 280, -140, 'Velocidade e investidas em linha reta.', [
        sk('corredor_arrancada', 'Arrancada', 'Ganha um deslocamento completo a mais (ação rápida).', kind='utility', range=0, cd=2, mp=3, target='self', fx={'extraMove': True}, apCost=1, anim='dash'),
        passive('corredor_pernas', 'Pernas de Atleta', '+2 de deslocamento.', {'moveBonus': 2}, lv=2),
        sk('corredor_investida', 'Investida', 'Corre até 4 casas em linha, golpeando quem estiver no caminho.', range=4, power=6, cd=2, mp=5, target='tile', shape='line', fx={'dashThrough': True}, anim='dash', lv=4),
        passive('corredor_embalo', 'Embalo', 'Sair do lado de inimigos não provoca ataque de oportunidade.', {'noOpportunity': True}, lv=7),
    ], group='movimento', short='Corredor'),
    node('acrobata', 'Acrobata', 'evolucao', 330, -50, 'Saltos, altura e esquiva; ignora o terreno.', [
        sk('acrobata_salto', 'Salto Acrobático', 'Salta até 4 casas, por cima de tudo (ação rápida).', kind='utility', range=4, cd=1, mp=3, target='tile', fx={'teleport': True}, apCost=1, anim='leap'),
        passive('acrobata_parkour', 'Parkour', 'Escala paredes e prédios; pula até 4 níveis.', {'climb': True, 'jumpTo': 4}, lv=2),
        sk('acrobata_aereo', 'Ataque Aéreo', 'Salta sobre o alvo e golpeia (+50% de dano vindo de cima).', range=3, power=7, cd=2, mp=5, fx={'leap': True, 'fromAbove': 1.5}, anim='leap', lv=4),
        passive('acrobata_esquiva', 'Corpo Leve', 'Esquiva 20% a mais.', {'evasion': 20}, lv=7),
    ], group='movimento', short='Acrobata'),
    node('batedor', 'Batedor', 'evolucao', 330, 50, 'Reconhecimento, visão longa, abre caminho.', [
        sk('batedor_sinal', 'Sinalizar', 'Marca todos numa área 3×3 por 2 turnos.', kind='utility', range=9, cd=2, mp=3, target='tile', shape='radius', radius=1, status={'id': 'marcado', 'turns': 2}, apCost=1, anim='arrow'),
        passive('batedor_olhos', 'Olhos Abertos', 'Enxerga inimigos escondidos.', {'seeHidden': True}, lv=2),
        sk('batedor_correr_atirar', 'Correr e Atirar', 'Tiro rápido: a próxima vez chega na metade do tempo.', kind='ranged', range=W, power=5, cd=1, mp=4, apCost=1, anim='arrow', lv=4),
        passive('batedor_trilha', 'Trilha', '+1 de deslocamento.', {'moveBonus': 1}, lv=7),
    ], group='movimento', short='Batedor'),
    node('infiltrador', 'Infiltrador', 'evolucao', 280, 140, 'Furtividade e flanco.', [
        sk('infiltrador_sumir', 'Sumir', 'Some da vista dos inimigos (esconde-se) por 2 turnos.', kind='utility', range=0, cd=2, mp=4, target='self', fx={'hide': 'any'}, value=2, anim='smoke'),
        passive('infiltrador_passos', 'Passos Leves', 'Sair do lado de inimigos não provoca ataque de oportunidade.', {'noOpportunity': True}, lv=2),
        sk('infiltrador_furtivo', 'Ataque Furtivo', 'Reaparece atrás do alvo e golpeia (+25% de crítico).', range=4, power=8, cd=2, mp=5, fx={'behind': True, 'crit': 25}, anim='blink', lv=4),
        passive('infiltrador_sombra', 'Sombra', 'Esquiva 15% a mais.', {'evasion': 15}, lv=7),
    ], group='movimento', short='Infiltrador'),

    # ── SUPORTE (S) ──
    node('resgatista', 'Resgatista', 'evolucao', 120, 260, 'Carrega caídos e civis; evacuação.', [
        sk('resgatista_puxar', 'Puxar para Cobertura', 'Puxa um aliado 3 casas para perto (ação rápida).', kind='utility', range=5, cd=1, mp=3, target='ally', fx={'pull': 3}, apCost=1, anim='buff'),
        passive('resgatista_ombro', 'Ombro Forte', '+1 de deslocamento (carrega o caído sem perder o passo).', {'moveBonus': 1}, lv=2),
        sk('resgatista_estabilizar', 'Socorro à Distância', 'Cura 15% da vida de um aliado e limpa estados.', kind='heal', range=3, cd=1, mp=5, target='ally', fx={'healPct': 0.15, 'cleanse': True}, anim='heal', lv=4),
        passive('resgatista_escudo', 'Corpo na Frente', 'Intercepta 30% dos golpes contra um aliado ao lado.', {'intercept': {'radius': 1, 'pct': 0.3, 'mitigate': 0.2}}, lv=7),
    ], group='suporte', short='Resgatista'),
    node('socorrista', 'Socorrista', 'evolucao', 270, 200, 'Cura, estabiliza, limpa estados.', [
        sk('socorrista_socorros', 'Primeiros Socorros', 'Cura 30% da vida de um aliado ao lado.', kind='heal', range=1, mp=4, target='ally', fx={'healPct': 0.3}, anim='heal'),
        passive('socorrista_kit', 'Kit Ampliado', 'Aliados ao lado regeneram vida a cada rodada.', {'aura': {'radius': 1, 'allies': True, 'status': {'id': 'regenerando', 'turns': 1}}}, lv=2),
        sk('socorrista_adrenalina', 'Injeção de Adrenalina', 'Um aliado ao lado age bem antes (enche metade da barra de ação).', kind='buff', range=1, cd=3, mp=6, target='ally', fx={'grantAp': 1}, anim='buff', lv=4),
        sk('socorrista_area', 'Hospital de Campanha', 'Cura 18% da vida de todos numa área 3×3.', kind='heal', range=4, cd=3, mp=9, target='tile', shape='radius', radius=1, fx={'healPct': 0.18, 'cleanse': True}, anim='heal', lv=7),
    ], group='suporte', short='Socorrista'),
    node('guardiao', 'Guardião', 'evolucao', -120, 260, 'Escudos; intercepta golpes de aliados ao lado.', [
        sk('guardiao_escudo', 'Escudo', 'Um aliado fica fortificado por 2 turnos.', kind='buff', range=3, mp=4, target='ally', status={'id': 'fortificado', 'turns': 2}, anim='buff'),
        passive('guardiao_interceptar', 'Interceptar', 'Intercepta metade dos golpes contra aliados ao lado (40% menos dano).', {'intercept': {'radius': 1, 'pct': 0.5, 'mitigate': 0.4}}, lv=2),
        sk('guardiao_posicao', 'Posição Defensiva', 'Fica inabalável por 2 turnos (não é empurrado nem derrubado).', kind='buff', range=0, cd=3, mp=5, target='self', status={'id': 'inabalavel', 'turns': 2}, apCost=1, anim='buff', lv=4),
        sk('guardiao_muralha', 'Muralha Viva', 'Aliados a até 1 casa ficam fortificados por 2 turnos.', kind='buff', range=0, cd=3, mp=7, target='self', shape='radius', radius=1, status={'id': 'fortificado', 'turns': 2}, anim='shout', lv=7),
    ], group='suporte', short='Guardião'),
    node('estrategista', 'Estrategista', 'evolucao', -270, 200, 'Ordens: ações extras e bônus de equipe.', [
        sk('estrategista_ordem', 'Ordem: Avançar!', 'Um aliado a até 6 casas age bem antes (enche metade da barra de ação).', kind='buff', range=6, cd=3, mp=6, target='ally', fx={'grantAp': 1}, anim='shout'),
        passive('estrategista_presenca', 'Presença de Comando', 'Aliados a até 2 casas ficam afiados (+acerto).', {'aura': {'radius': 2, 'allies': True, 'status': {'id': 'afiado', 'turns': 1}}}, lv=2),
        sk('estrategista_plano', 'Plano de Ataque', 'Aliados a até 3 casas ficam inspirados (+dano) por 2 turnos.', kind='buff', range=0, cd=4, mp=8, target='self', shape='radius', radius=3, status={'id': 'inspirado', 'turns': 2}, anim='shout', lv=4),
        sk('estrategista_leitura', 'Leitura do Campo', 'Marca todos numa área 5×5 por 2 turnos.', kind='utility', range=9, cd=3, mp=6, target='tile', shape='radius', radius=2, status={'id': 'marcado', 'turns': 2}, apCost=1, anim='arrow', lv=7),
    ], group='suporte', short='Estrategista'),

    # ── CONTROLE (O) ──
    node('restritor', 'Restritor', 'evolucao', -280, -140, 'Imobiliza, agarra, prende.', [
        sk('restritor_imobilizar', 'Imobilizar', 'O alvo não sai do lugar por 2 turnos.', kind='magic', range=4, power=2, cd=1, mp=4, status={'id': 'imobilizado', 'turns': 2}, anim='orb'),
        sk('restritor_agarrar', 'Agarrar', 'Agarra o alvo ao lado: ele fica preso enquanto você segurar.', range=1, power=3, cd=2, mp=4, fx={'grab': True}, status={'id': 'preso', 'turns': 2}, anim='claw', lv=2),
        passive('restritor_firme', 'Pés no Chão', 'Não pode ser imobilizado nem derrubado.', {'immune': ['imobilizado', 'derrubado']}, lv=4),
        sk('restritor_rede', 'Rede de Contenção', 'Todos numa área 3×3 ficam imobilizados por 1 turno.', kind='utility', range=5, cd=3, mp=7, target='tile', shape='radius', radius=1, status={'id': 'imobilizado', 'turns': 1}, anim='orb', lv=7),
    ], group='controle', short='Restritor'),
    node('manipulador', 'Manipulador', 'evolucao', -330, -50, 'Empurra, puxa e reposiciona.', [
        sk('manipulador_puxao', 'Puxão', 'Puxa o alvo 3 casas para perto.', kind='magic', range=5, power=2, cd=1, mp=4, fx={'pull': 3}, anim='orb'),
        sk('manipulador_empurrao', 'Empurrão Forte', 'Arremessa o alvo ao lado 3 casas.', range=1, power=4, cd=1, mp=4, fx={'push': 3}, anim='charge', lv=2),
        sk('manipulador_troca', 'Reposicionar', 'Troca de lugar com um aliado a até 5 casas (ação rápida).', kind='utility', range=5, cd=2, mp=4, target='ally', fx={'swap': True}, apCost=1, anim='blink', lv=4),
        passive('manipulador_ancora', 'Âncora', 'Não pode ser empurrado nem derrubado.', {'immune': ['derrubado']}, lv=7),
    ], group='controle', short='Manipulador'),
    node('supressor', 'Supressor', 'evolucao', -330, 50, 'Negação de área, supressão, zonas.', [
        sk('supressor_fogo', 'Fogo de Supressão', 'Prende o alvo sob fogo: se ele se mexer, leva um tiro.', kind='ranged', range=W, power=2, cd=1, mp=3, fx={'suppress': True}, anim='volley'),
        sk('supressor_minas', 'Campo Minado', 'Espalha 3 minas numa área 3×3 (dano e derruba).', kind='utility', range=5, cd=3, mp=6, target='tile', shape='radius', radius=1, fx={'trap': {'damage': 9, 'status': {'id': 'derrubado', 'turns': 1}, 'count': 3}}, anim='trap', lv=2),
        passive('supressor_vigia', 'Vigia', 'O tiro básico alcança 1 casa a mais.', {'reachBonus': 1}, lv=4),
        sk('supressor_barragem', 'Barragem', 'Rajada sobre uma área 3×3: dano e deixa lento.', kind='ranged', range=7, power=4, cd=3, mp=7, target='tile', shape='radius', radius=1, status={'id': 'lento', 'turns': 2}, anim='volley', lv=7),
    ], group='controle', short='Supressor'),
    node('perturbador', 'Perturbador', 'evolucao', -280, 140, 'Estados: confusão, silêncio, atraso.', [
        sk('perturbador_atordoante', 'Granada Atordoante', 'Atordoa (60%) todos numa área 3×3.', kind='utility', range=5, power=1, cd=2, mp=5, target='tile', shape='radius', radius=1, status={'id': 'atordoado', 'turns': 1, 'chance': 60}, anim='orb'),
        sk('perturbador_fumaca', 'Cortina de Fumaça', 'Fumaça numa área 3×3: atrapalha a mira de quem atira através dela.', kind='utility', range=5, cd=2, mp=3, target='tile', shape='radius', radius=1, fx={'cloud': 'fumaca'}, apCost=1, anim='smoke', lv=2),
        sk('perturbador_interferencia', 'Interferência', 'Silencia o alvo por 2 turnos: sem Dom nem técnicas.', kind='magic', range=6, power=1, cd=3, mp=6, status={'id': 'silenciado', 'turns': 2}, anim='bolt', lv=4),
        sk('perturbador_confundir', 'Confundir', 'Confunde (65%) o alvo por 1 turno.', kind='magic', range=5, power=1, cd=2, mp=5, status={'id': 'confuso', 'turns': 1, 'chance': 65}, anim='orb', lv=7),
    ], group='controle', short='Perturbador'),

    # ── FUSÕES (diagonais) ──
    node('ariete', 'Aríete', 'hibrida', 200, -330, 'Demolidor + Corredor: o dano cresce com as casas percorridas.', [
        sk('ariete_investida', 'Aríete', 'Corre em linha até 6 casas: cada casa percorrida soma 15% ao dano.', range=6, power=6, cd=2, mp=6, target='tile', shape='line', fx={'dashThrough': True, 'ram': 0.15}, anim='dash', lv=8),
        passive('ariete_embalo', 'Embalo Brutal', 'Não é derrubado e não provoca ataque de oportunidade.', {'immune': ['derrubado'], 'noOpportunity': True}, lv=9),
        sk('ariete_atropelo', 'Atropelo', 'Corre em linha até 8 casas: +20% de dano por casa, e arremessa.', range=8, power=7, cd=4, mp=10, target='tile', shape='line', fx={'dashThrough': True, 'ram': 0.2, 'push': 1}, anim='dash', lv=11),
    ], parents=['demolidor', 'corredor'], unlockAt=2, short='Aríete'),
    node('bombardeiro', 'Bombardeiro', 'hibrida', 330, -200, 'Artilheiro + Acrobata: ataca do alto com mais força.', [
        sk('bombardeiro_mergulho', 'Mergulho Explosivo', 'Explosão 3×3 a até 4 casas: +60% de dano se estiver mais alto.', kind='ranged', range=4, power=6, cd=2, mp=6, target='tile', shape='radius', radius=1, fx={'fromAbove': 1.6}, anim='meteor', lv=8),
        passive('bombardeiro_asas', 'Asas de Chumbo', 'Escala e pula até 5 níveis.', {'climb': True, 'jumpTo': 5}, lv=9),
        sk('bombardeiro_chuva', 'Chuva do Alto', 'Explosão 5×5 a até 7 casas: +50% vindo de cima.', kind='ranged', range=7, power=7, cd=4, mp=10, target='tile', shape='radius', radius=2, fx={'fromAbove': 1.5, 'destroyProps': True}, anim='meteor', lv=11),
    ], parents=['artilheiro', 'acrobata'], unlockAt=2, short='Bombardeiro'),
    node('extrator', 'Extrator', 'hibrida', 330, 200, 'Infiltrador + Resgatista: tira o ferido de lá sem ser visto.', [
        sk('extrator_troca', 'Extração', 'Troca de lugar com um aliado a até 6 casas e fica camuflado (ação rápida).', kind='utility', range=6, cd=2, mp=5, target='ally', fx={'swap': True, 'self': {'id': 'camuflado', 'turns': 1}}, apCost=1, anim='blink', lv=8),
        passive('extrator_fantasma', 'Fantasma', 'Não provoca ataques de oportunidade; +1 de deslocamento.', {'noOpportunity': True, 'moveBonus': 1}, lv=9),
        sk('extrator_sumir', 'Sumir com o Ferido', 'Some da vista por 2 turnos e limpa estados.', kind='utility', range=0, cd=3, mp=5, target='self', fx={'hide': 'any', 'cleanse': True}, value=2, anim='smoke', lv=11),
    ], parents=['infiltrador', 'resgatista'], unlockAt=2, short='Extrator'),
    node('paramedico', 'Paramédico de Campo', 'hibrida', 200, 330, 'Batedor + Socorrista: correr e curar numa ação só.', [
        sk('paramedico_corrida', 'Corrida de Socorro', 'Cura 25% de um aliado a até 6 casas (ação rápida).', kind='heal', range=6, cd=2, mp=6, target='ally', fx={'healPct': 0.25}, apCost=1, anim='heal', lv=8),
        passive('paramedico_aura', 'Mãos que Curam', 'Aliados a até 2 casas regeneram vida a cada rodada.', {'aura': {'radius': 2, 'allies': True, 'status': {'id': 'regenerando', 'turns': 1}}}, lv=9),
        sk('paramedico_reanimar', 'Reanimação', 'Cura 50% de um aliado ao lado e limpa estados.', kind='heal', range=1, cd=4, mp=10, target='ally', fx={'healPct': 0.5, 'cleanse': True}, anim='heal', lv=11),
    ], parents=['batedor', 'socorrista'], unlockAt=2, short='Paramédico'),
    node('muralha', 'Muralha', 'hibrida', -200, 330, 'Guardião + Supressor: uma zona que o inimigo não atravessa.', [
        sk('muralha_paredao', 'Paredão', 'Ergue muros de pedra numa área 3×3 (cobertura instantânea).', kind='utility', range=3, cd=3, mp=6, target='tile', shape='radius', radius=1, fx={'wall': 'rocha'}, apCost=1, anim='summon', lv=8),
        passive('muralha_escudo', 'Escudo Total', 'Intercepta 40% dos golpes contra aliados a até 2 casas (50% menos dano).', {'intercept': {'radius': 2, 'pct': 0.4, 'mitigate': 0.5}}, lv=9),
        sk('muralha_zona', 'Zona Proibida', 'Espalha 5 armadilhas que prendem numa área 5×5.', kind='utility', range=4, cd=4, mp=9, target='tile', shape='radius', radius=2, fx={'trap': {'status': {'id': 'imobilizado', 'turns': 1}, 'damage': 4, 'count': 5}}, anim='trap', lv=11),
    ], parents=['guardiao', 'supressor'], unlockAt=2, short='Muralha'),
    node('maestro', 'Maestro', 'hibrida', -330, 200, 'Estrategista + Perturbador: reordena o turno.', [
        sk('maestro_regencia', 'Regência', 'Um aliado a até 8 casas age bem antes (enche metade da barra de ação).', kind='buff', range=8, cd=2, mp=7, target='ally', fx={'grantAp': 1}, anim='shout', lv=8),
        passive('maestro_compasso', 'Compasso', 'Inimigos a até 1 casa ficam lentos.', {'aura': {'radius': 1, 'status': {'id': 'lento', 'turns': 1}}}, lv=9),
        sk('maestro_caos', 'Sinfonia do Caos', 'Confunde (60%) todos numa área 5×5.', kind='magic', range=7, power=2, cd=4, mp=10, target='tile', shape='radius', radius=2, status={'id': 'confuso', 'turns': 1, 'chance': 60}, anim='nova', lv=11),
    ], parents=['estrategista', 'perturbador'], unlockAt=2, short='Maestro'),
    node('grappler', 'Grappler', 'hibrida', -330, -200, 'Manipulador + Duelista: puxa e golpeia na mesma ação.', [
        sk('grappler_puxa', 'Puxa e Golpeia', 'Salta até o alvo a até 4 casas e golpeia.', range=4, power=7, cd=1, mp=5, fx={'leap': True}, anim='leap', lv=8),
        passive('grappler_pegada', 'Pegada', 'Esquiva 10% e recebe 10% menos dano corpo a corpo.', {'evasion': 10, 'reduce': {'melee': 0.1}}, lv=9),
        sk('grappler_suplex', 'Suplex', 'Ergue o alvo e o arremessa 3 casas: dano enorme e derruba.', range=1, power=10, cd=3, mp=8, fx={'push': 3}, status={'id': 'derrubado', 'turns': 1}, anim='charge', lv=11),
    ], parents=['manipulador', 'duelista'], unlockAt=2, short='Grappler'),
    node('executor', 'Executor de Contenção', 'hibrida', -200, -330, 'Restritor + Caçador: o alvo preso recebe dano adicional.', [
        sk('executor_contido', 'Execução Contida', 'Tiro com +80% de dano em alvos imobilizados.', kind='ranged', range=W, power=7, cd=1, mp=5, fx={'vs': {'status': 'imobilizado', 'mult': 1.8}}, anim='arrow', lv=8),
        passive('executor_olho', 'Olho do Carrasco', 'Enxerga inimigos escondidos.', {'seeHidden': True}, lv=9),
        sk('executor_sentenca', 'Sentença', 'Derruba alvos abaixo de 30%; +50% de dano em imobilizados.', kind='ranged', range=W, power=9, cd=3, mp=9, fx={'execute': 0.3, 'vs': {'status': 'imobilizado', 'mult': 1.5}}, anim='arrow', lv=11),
    ], parents=['restritor', 'cacador'], unlockAt=2, short='Executor'),
]

SNIPER = ['precisao', 'pistola']
ASSALTO = ['fuzil', 'escopeta']
PESADO = ['metralhadora', 'lanca_granadas']

ARMAS = [
    node('armas_base', 'Treino com Armas', 'base', 0, 0, 'Todo combatente sabe atirar, recarregar e se proteger.', [
        passive('armas_inato', 'Treino Básico', 'Sabe usar qualquer arma de fogo.', {}),
    ]),
    node('sniper', 'Sniper', 'evolucao', 0, -160, 'Longe e no alto; o tiro decisivo. (Fuzil de precisão ou pistola.)', [
        sk('sniper_mirado', 'Tiro Mirado', 'Gasta o turno mirando: +15 de acerto e +20% de crítico.', kind='ranged', range=W, power=8, cd=1, mp=3, accuracy=15, fx={'crit': 20}, needsWeapon=SNIPER, anim='arrow'),
        passive('sniper_visao', 'Visão de Atirador', 'O tiro básico alcança 2 casas a mais.', {'reachBonus': 2}, lv=3),
        sk('sniper_perna', 'Tiro na Perna', 'Imobiliza o alvo por 1 turno.', kind='ranged', range=W, power=4, cd=2, mp=4, status={'id': 'imobilizado', 'turns': 1}, needsWeapon=SNIPER, anim='arrow', lv=5),
        passive('sniper_paciencia', 'Paciência', 'Enxerga inimigos escondidos.', {'seeHidden': True}, lv=7),
        sk('sniper_cabeca', 'Tiro na Cabeça', 'Ignora metade da defesa e tem +40% de crítico.', kind='ranged', range=W, power=12, cd=4, mp=8, fx={'crit': 40, 'pierce': 0.5}, needsWeapon=SNIPER, anim='arrow', lv=9),
    ]),
    node('assalto', 'Assalto', 'evolucao', 160, 0, 'Perto, mobilidade, pressão. (Fuzil ou escopeta.)', [
        sk('assalto_correr', 'Correr e Atirar', 'Tiro rápido: a próxima vez chega na metade do tempo.', kind='ranged', range=W, power=5, cd=1, mp=3, apCost=1, needsWeapon=ASSALTO, anim='arrow'),
        passive('assalto_agil', 'Ágil', '+1 de deslocamento.', {'moveBonus': 1}, lv=3),
        sk('assalto_rajada', 'Rajada', 'Dois tiros seguidos (gasta munição como um).', kind='ranged', range=W, power=4, cd=2, mp=4, fx={'hits': 2}, needsWeapon=ASSALTO, anim='volley', lv=5),
        passive('assalto_frio', 'Sangue Frio', 'Recebe 15% menos dano de tiros.', {'reduce': {'ranged': 0.15}}, lv=7),
        sk('assalto_queima', 'Queima-roupa', 'Tiro a até 2 casas: dano enorme e +30% de crítico.', kind='ranged', range=2, power=10, cd=3, mp=6, fx={'crit': 30}, needsWeapon=ASSALTO, anim='volley', lv=9),
    ]),
    node('pesado', 'Pesado', 'evolucao', 0, 160, 'Área e cobertura destruída. (Metralhadora ou lança-granadas.)', [
        sk('pesado_supressao', 'Supressão Pesada', 'Prende o alvo sob fogo: se ele se mexer, leva um tiro.', kind='ranged', range=W, power=2, cd=1, mp=3, fx={'suppress': True}, needsWeapon=PESADO, anim='volley'),
        sk('pesado_granada', 'Granada', 'Explosão 3×3 a até 6 casas; destrói cobertura.', kind='ranged', range=6, power=7, cd=2, mp=5, target='tile', shape='radius', radius=1, fx={'destroyProps': True}, anim='orb', lv=3),
        passive('pesado_couraca', 'Couraça', 'Recebe 15% menos dano físico e não é derrubado.', {'reduce': {'physical': 0.15}, 'immune': ['derrubado']}, lv=5),
        sk('pesado_demolicao', 'Demolição', 'Derruba paredes numa área 3×3 (quem está atrás leva dano).', kind='ranged', range=6, power=5, cd=3, mp=6, target='tile', shape='radius', radius=1, fx={'destroyProps': True}, needsWeapon=PESADO, anim='meteor', lv=7),
        sk('pesado_chuva', 'Chuva de Balas', 'Varre um cone à frente.', kind='ranged', range=5, power=6, cd=4, mp=8, shape='cone', needsWeapon=PESADO, anim='volley', lv=9),
    ]),
    node('especialista', 'Especialista', 'evolucao', -160, 0, 'Tecnologia e armadilhas. (Qualquer arma.)', [
        sk('especialista_drone', 'Drone de Cura', 'O drone cura 18% de um aliado a até 7 casas.', kind='heal', range=7, cd=1, mp=4, target='ally', fx={'healPct': 0.18}, anim='heal'),
        sk('especialista_mina', 'Mina de Choque', 'Arma uma mina: dano e atordoa quem pisar.', kind='utility', range=4, cd=2, mp=4, target='tile', fx={'trap': {'damage': 10, 'status': {'id': 'atordoado', 'turns': 1}}}, apCost=1, anim='trap', lv=3),
        sk('especialista_hack', 'Hackear', 'Desliga o alvo: silenciado por 2 turnos (sem Dom nem técnicas).', kind='magic', range=7, power=2, cd=3, mp=5, status={'id': 'silenciado', 'turns': 2}, anim='bolt', lv=5),
        passive('especialista_ferramentas', 'Cinto de Ferramentas', 'O tiro básico alcança 1 casa a mais.', {'reachBonus': 1}, lv=7),
        sk('especialista_pulso', 'Pulso de Interferência', 'Silencia todos numa área 5×5 por 1 turno.', kind='magic', range=6, power=1, cd=4, mp=8, target='tile', shape='radius', radius=2, status={'id': 'silenciado', 'turns': 1}, anim='nova', lv=9),
    ]),
]


def write(name, tree):
    path = os.path.join(ROOT, name)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(tree, f, ensure_ascii=False, indent=1)
        f.write('\n')


def main():
    write('teia.json', {'id': 'teia', 'classId': 'impacto', 'classIds': ['impacto', 'movimento', 'suporte', 'controle'], 'name': 'Teia das Classes', 'maxRank': 1, 'nodes': TEIA})
    write('armas.json', {'id': 'armas', 'classId': 'impacto', 'name': 'Combate com Armas', 'maxRank': 1, 'kind': 'weapon', 'nodes': ARMAS})
    n = sum(len(x['skills']) for x in TEIA)
    m = sum(len(x['skills']) for x in ARMAS)
    print(f'teia: {len(TEIA)} nós, {n} habilidades · armas: {len(ARMAS)} nós, {m} habilidades')


if __name__ == '__main__':
    main()
