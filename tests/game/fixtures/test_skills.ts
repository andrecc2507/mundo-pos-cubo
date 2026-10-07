import { DB, creatureSkillToSkill, type ComboDef, type TreeSkill } from '@game/data';

/**
 * Habilidades e combo de teste: exercitam mecânicas genéricas do motor (confinamento, fumaça, vento,
 * elementos, combos, fogo amigo) sem depender das árvores do jogo. Importar registra tudo no `DB`.
 */
const SKILLS = [
 {
  "id": "elementalista_raio_de_eletricidade",
  "name": "Raio de Eletricidade",
  "description": "Ataque elétrico de alvo único à distância. Dano bruto baseado no atributo, sem penalidades.",
  "kind": "magic",
  "range": 5,
  "power": 4,
  "cooldown": 0,
  "element": "eletricidade",
  "mp": 4,
  "levelReq": 1,
  "grantedBy": "elementalista_iniciado_no_estudo_dos_elementos"
 },
 {
  "id": "elementalista_raio_de_fogo",
  "name": "Raio de Fogo",
  "description": "Ataque de fogo de alvo único à distância. Dano bruto baseado no atributo, sem penalidades.",
  "kind": "magic",
  "range": 5,
  "power": 4,
  "cooldown": 0,
  "element": "fogo",
  "mp": 4,
  "levelReq": 1,
  "grantedBy": "elementalista_iniciado_no_estudo_dos_elementos"
 },
 {
  "id": "elementalista_raio_de_ar",
  "name": "Raio de Ar",
  "description": "Ataque de vento de alvo único à distância. Dano bruto baseado no atributo, sem penalidades.",
  "kind": "magic",
  "range": 5,
  "power": 4,
  "cooldown": 0,
  "element": "vento",
  "mp": 4,
  "levelReq": 1,
  "grantedBy": "elementalista_iniciado_no_estudo_dos_elementos"
 },
 {
  "id": "fogo_bola_de_fogo_maior",
  "name": "Bola de Fogo Maior",
  "description": "Esfera instável que explode em área 3x3 com alto dano.",
  "kind": "magic",
  "range": 6,
  "power": 10,
  "cooldown": 3,
  "radius": 1,
  "shape": "radius",
  "target": "tile",
  "element": "fogo",
  "mp": 10,
  "levelReq": 9
 },
 {
  "id": "ar_vacuo_subito",
  "name": "Vácuo Súbito",
  "description": "Remove o ar de uma área: puxa todos ao centro e causa asfixia.",
  "kind": "magic",
  "range": 5,
  "power": 4,
  "cooldown": 3,
  "radius": 2,
  "shape": "radius",
  "target": "tile",
  "element": "vento",
  "fx": {
   "pull": 2
  },
  "mp": 6,
  "levelReq": 18
 },
 {
  "id": "sabotador_bomba_de_fumaca_sufocante",
  "name": "Bomba de Fumaça Sufocante",
  "description": "Granada que cria fumaça densa: inimigos na área ficam Silenciados e perdem precisão.",
  "kind": "magic",
  "range": 5,
  "power": 0,
  "cooldown": 3,
  "radius": 1,
  "shape": "radius",
  "target": "tile",
  "status": {
   "id": "silenciado",
   "turns": 1
  },
  "fx": {
   "noDamage": true,
   "also": [
    {
     "id": "cegado",
     "turns": 2
    }
   ],
   "surface": "fumaca",
   "arc": true
  },
  "mp": 6,
  "levelReq": 6
 },
 {
  "id": "selos_selo_de_confinamento",
  "name": "Selo de Confinamento",
  "description": "Escolha dois cantos opostos de uma área (3 a 7 casas de lado): um selo é arremessado em cada um dos 4 cantos e paredes de energia se erguem ligando os selos. Nenhum ataque, habilidade, item ou passo entra ou sai. Quem está dentro precisa quebrar um dos selos; quem está fora pode quebrar a concentração de quem conjurou. Dura até 3 rodadas.",
  "kind": "utility",
  "target": "tile",
  "range": 6,
  "power": 0,
  "cooldown": 5,
  "mp": 14,
  "levelReq": 36,
  "fx": {
   "confine": {
    "turns": 3,
    "sealHp": 40
   },
   "concentration": true
  }
 }
] as unknown as TreeSkill[];

const COMBOS = [{"id": "onda_flamejante", "name": "Onda Flamejante", "a": "elementalista_raio_de_fogo", "b": "elementalista_raio_de_ar", "partnerRange": 3, "result": {"range": 5, "target": "tile", "shape": "radius", "radius": 2, "kind": "magic", "power": 20, "element": "fogo"}, "description": "O vento amplia o raio de fogo numa onda em área."}] as ComboDef[];

for (const s of SKILLS) DB.skills[s.id] = { ...creatureSkillToSkill(s, 'controle', s.mp), tree: 'teste' };
for (const c of COMBOS) DB.combos[c.id] = c;
