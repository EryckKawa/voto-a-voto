"""O que os partidos pregam: posição de cada partido pelo texto do plano de governo do seu candidato a presidente.

Método: Wordscores (Laver, Benoit e Garry, 2003, American Political Science Review 97(2)).
  - Textos de referência: os planos de 2018, cada um com a nota do partido no survey de Bolognesi, Ribeiro e Codato (julho de
    2018), já na escala comum de −1 a +1 (mesma conversão de notas_estudos.py).
  - Cada palavra recebe uma nota: a média das notas das referências, ponderada por quanto a palavra aparece em cada uma.
  - Cada plano de 2022 e 2026 (textos "virgens") recebe a média das notas das suas palavras, ponderada pela frequência.
  - As notas virgens são reescaladas (transformação de Laver, Benoit e Garry) para terem a mesma dispersão das referências.
  - Validação: cada plano de 2018 é tirado das referências e pontuado pelos outros 12 (deixa-um-fora).
Saída: scripts/planos_wordscores.csv (linhagem, ano, nota, palavras pontuadas) e o resumo da validação no fim do arquivo JSON.
"""
import csv, json, os, re, sys, unicodedata
import numpy as np, duckdb

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
from notas_estudos import linhagem

BANCO = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/br/db/eleicoes_brasil.duckdb'
# palavras muito comuns do português, que não dizem nada sobre posição política
PARADAS = set("""a o as os um uma uns umas de do da dos das no na nos nas em por para pelo pela pelos pelas com sem sob sobre entre ate apos ante
e ou mas nem que se como mais menos muito muita muitos muitas pouco tambem ja ainda so apenas quando onde qual quais quem cujo cuja
este esta estes estas esse essa esses essas aquele aquela aqueles aquelas isto isso aquilo seu sua seus suas nosso nossa nossos nossas
meu minha ele ela eles elas nos voce voces lhe lhes ser sao foi foram sera serao seja sejam ter tem tinha terao estar esta estao
fazer faz feito pode podem deve devem vai vao ha havera cada todo toda todos todas outro outra outros outras mesmo mesma tanto tao
qualquer alguns algumas nenhum nenhuma assim entao porque pois portanto contudo porem enquanto desde durante conforme segundo
ano anos vez vezes dia dias forma meio parte partir atraves junto bem bom boa grande grandes novo nova novos novas primeiro primeira
governo brasil brasileiro brasileira brasileiros brasileiras pais nacional federal plano programa proposta propostas candidato
candidata presidente presidencia republica partido coligacao vice eleicao eleicoes pagina capitulo""".split())

def normaliza(t):
    t = unicodedata.normalize('NFD', t.lower())
    return ''.join(ch for ch in t if unicodedata.category(ch) != 'Mn')

def main():
    con = duckdb.connect(BANCO, read_only=True)
    rows = con.execute("""SELECT e.nr_ano_eleicao, p.sg_partido, c.nm_urna, pg.tx_proposta FROM proposta_governo pg
                          JOIN candidatura c USING (id_candidatura) JOIN eleicao e ON e.id_eleicao = c.id_eleicao
                          JOIN partido p ON p.id_partido = c.id_partido""").fetchall()
    # nomes próprios (candidatos e siglas) saem: diriam quem é o partido, não o que ele propõe
    nomes = set()
    for _, sg, nm, _ in rows:
        nomes |= set(re.findall(r'[a-z]{3,}', normaliza(nm + ' ' + sg)))
    nomes |= {'lula', 'bolsonaro', 'haddad', 'ciro', 'marina', 'alckmin', 'boulos', 'temer', 'dilma', 'petista', 'petistas', 'bolsonarista'}
    docs = {}
    for ano, sg, nm, tx in rows:
        k = linhagem(sg, ano) or sg
        toks = [w for w in re.findall(r'[a-z]{3,}', normaliza(tx)) if w not in PARADAS and w not in nomes]
        # um texto por partido e ano (a troca de candidato com o mesmo plano não conta duas vezes)
        if (k, ano) not in docs or len(toks) > len(docs[(k, ano)][1]): docs[(k, ano)] = (sg, toks)
    # notas de referência: Bolognesi, Ribeiro e Codato (2018) convertidas para a escala comum
    aj = json.load(open(os.path.join(AQUI, '..', 'data', 'br', 'partidos_notas.json'), encoding='utf-8'))['fontes']['BRC']['ajuste']
    brc = {linhagem(r['sigla'], 2018): float(r['media']) for r in csv.DictReader(open(os.path.join(AQUI, 'bolognesi_2023.csv')))}
    ref = {k: max(-1, min(1, aj['a'] + aj['b'] * brc[k])) for (k, ano) in docs if ano == 2018 and k in brc}
    refs = sorted(ref)
    vocab = sorted({w for k in refs for w in docs[(k, 2018)][1]})
    # só palavras que aparecem em pelo menos 2 planos de referência
    from collections import Counter
    df = Counter(w for k in refs for w in set(docs[(k, 2018)][1]))
    vocab = [w for w in vocab if df[w] >= 2]
    idx = {w: i for i, w in enumerate(vocab)}

    def freq(toks):
        v = np.zeros(len(vocab))
        for w in toks:
            i = idx.get(w)
            if i is not None: v[i] += 1
        return v

    F_ref = {k: freq(docs[(k, 2018)][1]) for k in refs}
    def notas_palavras(usar):
        Fr = np.array([F_ref[k] / F_ref[k].sum() for k in usar])        # frequência relativa em cada referência
        P = Fr / np.where(Fr.sum(0) == 0, 1, Fr.sum(0))                  # P(referência | palavra)
        A = np.array([ref[k] for k in usar])
        S = A @ P                                                         # nota de cada palavra
        ok = Fr.sum(0) > 0
        return S, ok
    def pontua(toks, S, ok):
        f = freq(toks) * ok
        return float(f @ S / f.sum()), int(f.sum())

    # validação: deixa um fora
    S_all, ok_all = notas_palavras(refs)
    loo = []
    for k in refs:
        S, ok = notas_palavras([r for r in refs if r != k])
        loo.append((k, ref[k], pontua(docs[(k, 2018)][1], S, ok)[0]))
    bruto = np.array([x[2] for x in loo])
    alvo = np.array([x[1] for x in loo])
    # reescala LBG das notas deixa-um-fora, para comparar com as referências
    loo_r = (bruto - bruto.mean()) * (alvo.std() / bruto.std()) + bruto.mean()
    r_loo = float(np.corrcoef(alvo, bruto)[0, 1])
    rx, ry = np.argsort(np.argsort(alvo)), np.argsort(np.argsort(bruto))
    rho_loo = float(np.corrcoef(rx, ry)[0, 1])

    # textos virgens: 2022 e 2026, reescalados juntos
    virg = [(k, ano) for (k, ano) in docs if ano > 2018]
    raw = {kv: pontua(docs[kv][1], S_all, ok_all) for kv in virg}
    vs = np.array([raw[kv][0] for kv in virg]); refv = np.array([ref[k] for k in refs])
    resc = {kv: float((raw[kv][0] - vs.mean()) * (refv.std() / vs.std()) + vs.mean()) for kv in virg}
    with open(os.path.join(AQUI, 'planos_wordscores.csv'), 'w', newline='', encoding='utf-8') as fh:
        w = csv.writer(fh); w.writerow(['cd_linhagem', 'sg_partido', 'nr_ano', 'vr_nota', 'vr_bruto', 'qt_palavras', 'tipo'])
        for k in refs: w.writerow([k, docs[(k, 2018)][0], 2018, round(ref[k], 3), '', len(docs[(k, 2018)][1]), 'referencia'])
        for (k, a, n), lr in zip(loo, loo_r): w.writerow([k, docs[(k, 2018)][0], 2018, round(float(lr), 3), round(n, 4), len(docs[(k, 2018)][1]), 'deixa-um-fora'])
        for kv in sorted(virg, key=lambda x: (x[1], resc[x])):
            w.writerow([kv[0], docs[kv][0], kv[1], round(max(-1, min(1, resc[kv])), 3), round(raw[kv][0], 4), raw[kv][1], 'virgem'])
    json.dump({'r_deixa_um_fora': round(r_loo, 3), 'rho_deixa_um_fora': round(rho_loo, 3), 'n_referencias': len(refs), 'n_palavras': len(vocab),
               'referencias': {k: round(ref[k], 3) for k in refs}},
              open(os.path.join(AQUI, 'planos_wordscores_validacao.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('palavras', len(vocab), 'referências', len(refs), 'validação deixa-um-fora r=%.2f rho=%.2f' % (r_loo, rho_loo))
    for (k, a, n), lr in zip(loo, loo_r): print(f'  2018 {k:10} referência {a:+.2f}  deixa-um-fora {lr:+.2f}')
    for kv in sorted(virg, key=lambda x: (x[1], resc[x])): print(f'  {kv[1]} {kv[0]:10} {resc[kv]:+.2f}  ({raw[kv][1]} palavras)')

if __name__ == '__main__':
    main()
