#!/usr/bin/env python3
"""
Gera o catálogo central de Dons (Mundo Pós-Cubo): src/game/data/gifts/gifts.json e
src/game/data/gifts/signatures.json — 335 Dons em 14 categorias (tools/gift_catalog.py).

- Dons que já existiam (origem = id) mantêm o id, a mecânica, a passiva inata e a assinatura
  (gen_gifts.py e gen_signatures.py), com nome, número, categoria, raridade, estágios, Despertar e
  Limitação do catálogo.
- Dons novos usam a mecânica de tools/gift_catalog_new.py.

Rodar: python3 tools/gen_catalog.py
"""
import json
import os
import re
import unicodedata

import gen_gifts
import gen_signatures
import gift_catalog as CAT
from gift_catalog_new import MECH, SIG

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, '..', 'src', 'game', 'data', 'gifts')


def slug(name):
    return re.sub(r'[^a-z0-9]+', '_', unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode().lower()).strip('_')


def category(num):
    for roman, name, a, b, fam in CAT.CATEGORIES:
        if a <= num <= b:
            return roman, name, fam
    raise SystemExit(f'número sem categoria: {num}')


def opt(v):
    return v not in ('', '-')


def main():
    old = {g['id']: g for g in gen_gifts.build()}
    old_sig = gen_signatures.S
    gifts, sigs, seen = [], {}, set()
    for line in CAT.ROWS.strip().split('\n'):
        num, name, rar, p, c, v, src, desc, stages, awaken, limit = line.split('|')
        num = int(num)
        roman, catname, fam = category(num)
        if src == '+':
            gid = slug(name)
            if gid in seen:
                gid = f'{gid}_{num}'
            term, el, stt, zone, ov, aw, i, m, s, cc = MECH[gid].split('|')
            base = {'family': fam, 'term': term, 'overload': ov, 'awakening': aw}
            for k, val in (('element', el), ('status', stt), ('zone', zone)):
                if opt(val):
                    base[k] = val
            kit = {k: val for k, val in (('impacto', i), ('movimento', m), ('suporte', s), ('controle', cc)) if opt(val)}
            if kit:
                base['kit'] = kit
            weakness = limit
            innate, signature = SIG[gid]
            sigs[gid] = {'innate': innate, 'signature': signature}
        else:
            gid = src
            o = old[src]
            base = {k: o[k] for k in ('family', 'term', 'overload', 'awakening', 'element', 'status', 'zone', 'kit') if k in o}
            weakness = o['weakness'] if limit == '=' else limit
            sigs[gid] = old_sig[src]
        if gid in seen:
            raise SystemExit(f'id repetido: {gid}')
        seen.add(gid)
        gifts.append({
            'id': gid, 'num': num, 'name': name, 'category': roman, 'categoryName': catname, 'rarity': rar,
            **base,
            'description': desc, 'weakness': weakness,
            'power': int(p), 'control': int(c), 'versatility': int(v),
            'stages': stages.split(';'), 'awakeningText': awaken,
        })
    missing = set(MECH) - seen
    if missing:
        raise SystemExit(f'mecânica sem Dom no catálogo: {sorted(missing)}')
    with open(os.path.join(OUT, 'gifts.json'), 'w', encoding='utf-8') as f:
        f.write('[\n' + ',\n'.join(' ' + json.dumps(g, ensure_ascii=False) for g in gifts) + '\n]\n')
    with open(os.path.join(OUT, 'signatures.json'), 'w', encoding='utf-8') as f:
        json.dump({'_doc': 'Gerado por tools/gen_catalog.py: passiva inata com efeito e técnica-assinatura de cada Dom (o que o torna único).', 'gifts': sigs}, f, ensure_ascii=False, indent=1)
        f.write('\n')
    by = {}
    for g in gifts:
        by[g['rarity']] = by.get(g['rarity'], 0) + 1
    print(len(gifts), 'Dons', by)


if __name__ == '__main__':
    main()
