import math
import re
import unicodedata
from difflib import SequenceMatcher

JANELA_OSCILACAO = 10


def normalizar(texto: str):
    texto = texto.lower()
    texto = unicodedata.normalize("NFD", texto)
    texto = "".join(c for c in texto if unicodedata.category(c) != "Mn")
    texto = re.sub(r"[^\w\s]", "", texto)
    texto = re.sub(r"\s+", " ", texto).strip()
    palavras = texto.split()

    sem_repeticoes = []
    for i, p in enumerate(palavras):
        if i == 0 or p != palavras[i - 1]:
            sem_repeticoes.append(p)

    return sem_repeticoes


def detectar_blocos_gaguejo(palavras_processadas: list, min_pausa: float = 0.4, min_reps: int = 2) -> list:
    blocos = []
    n = len(palavras_processadas)
    i = 0
    while i < n:
        palavra = palavras_processadas[i]["word"].strip().lower()
        j = i + 1
        while j < n and palavras_processadas[j]["word"].strip().lower() == palavra:
            j += 1

        reps = j - i
        if reps >= min_reps:
            pausa_antes = palavras_processadas[i]["silence_before"]
            blocos.append({
                "palavra":      palavras_processadas[i]["word"].strip(),
                "repeticoes":   reps,
                "pausa_antes":  pausa_antes,
                "inicio":       palavras_processadas[i]["start"],
                "fim":          palavras_processadas[j - 1]["end"],
                "com_bloqueio": pausa_antes >= min_pausa,
            })
            i = j
        else:
            i += 1

    return blocos


def detectar_blocos_silabicos(palavras_processadas: list, min_reps: int = 2) -> list:
    blocos = []
    n = len(palavras_processadas)
    i = 0
    while i < n:
        fragm = palavras_processadas[i]["word"].strip().lower()
        if len(fragm) > 4:
            i += 1
            continue

        j = i + 1
        while j < n and palavras_processadas[j]["word"].strip().lower() == fragm:
            j += 1

        reps = j - i
        if reps < min_reps:
            i += 1
            continue

        palavra_alvo = None
        if j < n:
            prox = palavras_processadas[j]["word"].strip().lower()
            if len(prox) > len(fragm) and prox.startswith(fragm):
                palavra_alvo = prox

        blocos.append({
            "fragmento":    palavras_processadas[i]["word"].strip(),
            "repeticoes":   reps,
            "palavra_alvo": palavra_alvo,
            "inicio":       palavras_processadas[i]["start"],
            "fim":          palavras_processadas[j - 1]["end"],
            "tipo":         "silabico" if palavra_alvo else "fragmento",
        })
        i = j + (1 if palavra_alvo else 0)

    return blocos


def detectar_prolongamentos(palavras_processadas: list) -> list:
    resultado = []
    for p in palavras_processadas:
        if not p.get("is_prolongation"):
            continue
        palavra = p["word"].strip().lower()
        duracao = p["duration"]
        esperado = max(len(palavra) * 0.12, 0.15)
        fator = round(duracao / esperado, 1) if esperado > 0 else 0
        resultado.append({
            "palavra":       p["word"].strip(),
            "inicio":        p["start"],
            "fim":           p["end"],
            "duracao":       duracao,
            "fator_excesso": fator,
        })
    return resultado


def comparar_textos(ref: str, trans: str):
    ref_words   = normalizar(ref)
    trans_words = normalizar(trans)
    matcher     = SequenceMatcher(None, ref_words, trans_words)

    resultado = {"acertos": [], "erros": [], "omitidas": [], "extras": [], "score": 0}
    total_ref = len(ref_words)
    acertos   = 0

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            palavras = ref_words[i1:i2]
            resultado["acertos"].extend(palavras)
            acertos += len(palavras)
        elif tag == "replace":
            resultado["erros"].append({"esperado": ref_words[i1:i2], "ouvido": trans_words[j1:j2]})
        elif tag == "delete":
            resultado["omitidas"].extend(ref_words[i1:i2])
        elif tag == "insert":
            resultado["extras"].extend(trans_words[j1:j2])

    resultado["score"]    = round(acertos / total_ref, 4) if total_ref > 0 else 0
    resultado["omitidas"] = sorted(resultado["omitidas"])
    resultado["extras"]   = sorted(resultado["extras"])
    return resultado


def classificar_fluencia(wpm: float, taxa_repeticao: float) -> str:
    if taxa_repeticao > 0.15:
        return "disfluente"
    elif wpm < 130:
        return "lento"
    elif wpm <= 160:
        return "normal"
    else:
        return "rapido"


def calcular_penalidade_temporal(
    palavras_obj: list,
    total_palavras_ref: int,
    duracao_total: float,
    segmentos: list,
) -> dict:
    duracao_esperada   = total_palavras_ref * 0.40
    ratio_duracao      = duracao_total / duracao_esperada if duracao_esperada > 0 else 1.0
    penalidade_duracao = round(min(max((ratio_duracao - 1.3) * 0.25, 0.0), 0.4), 4)

    if segmentos:
        logprobs        = [s.get("avg_logprob", 0.0) for s in segmentos]
        media_logprob   = sum(logprobs) / len(logprobs)
        penalidade_conf = round(min(max((-media_logprob - 0.5) * 0.3, 0.0), 0.3), 4)
    else:
        penalidade_conf = 0.0

    palavras_longas = 0
    if palavras_obj:
        for w in palavras_obj:
            palavra    = w["word"].strip().lower()
            duracao_w  = w["end"] - w["start"]
            esperado_w = max(len(palavra) * 0.08, 0.25)
            if duracao_w > esperado_w * 2.5:
                palavras_longas += 1

    return {
        "penalidade_duracao":   penalidade_duracao,
        "penalidade_confianca": penalidade_conf,
        "palavras_longas":      palavras_longas,
        "ratio_duracao":        round(ratio_duracao, 2),
    }


def get_prob_from_segments(word_start: float, segmentos: list) -> float:
    closest    = min(segmentos, key=lambda s: abs(s["start"] - word_start))
    avg_logprob = closest.get("avg_logprob", -1.0)
    return round(max(0.0, min(1.0, math.exp(avg_logprob))), 4)


def wpm_local(palavras: list, indice: int, janela: int) -> float:
    inicio = max(0, indice - janela // 2)
    fim    = min(len(palavras), indice + janela // 2 + 1)
    trecho = palavras[inicio:fim]

    if len(trecho) < 2:
        return 0.0

    duracao = trecho[-1]["end"] - trecho[0]["start"]
    if duracao <= 0:
        return 0.0

    return round(len(trecho) / (duracao / 60), 2)


def classificar_oscilacao(wpm_loc: float, limite_inf: float, limite_sup: float) -> str:
    if wpm_loc <= 0:
        return "indefinido"
    elif wpm_loc > limite_sup:
        return "acelerado"
    elif wpm_loc < limite_inf:
        return "lento"
    else:
        return "normal"
