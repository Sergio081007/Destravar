import random
from functools import lru_cache
from app.db.connection import get_connection


@lru_cache(maxsize=1)
def _carregar_mensagens() -> dict:
    supabase = get_connection()
    response = (
        supabase.table("mensagens_feedback")
        .select("status, subtipo, titulo, mensagem")
        .eq("ativo", True)
        .execute()
    )

    index: dict = {}
    for row in response.data or []:
        chave = (row["status"], row["subtipo"])
        index.setdefault(chave, []).append((row["titulo"], row["mensagem"]))
    return index


def _sortear(status: str, subtipo: str | None) -> dict:
    index  = _carregar_mensagens()
    opcoes = index.get((status, subtipo), [])

    if not opcoes:
        return {"titulo": "Continue assim!", "mensagem": "Você está evoluindo. Tente mais uma vez!"}

    titulo, mensagem = random.choice(opcoes)
    return {"titulo": titulo, "mensagem": mensagem}


def calcular_aprovacao(
    wpm: float,
    score_penalizado: float,
    wpm_min: float | None,
    wpm_max: float | None,
    limite_inferior: float | None,
    limite_superior: float | None,
) -> dict:
    faixa_min = wpm_min or 0.0
    faixa_max = wpm_max or float("inf")

    if limite_inferior is not None:
        faixa_min = max(faixa_min, limite_inferior)
    if limite_superior is not None:
        faixa_max = min(faixa_max, limite_superior)

    precisao_ok = score_penalizado >= 0.70
    sem_faixa   = faixa_max == float("inf") or faixa_min == 0.0

    if sem_faixa:
        dentro_faixa = True
        desvio_pct   = 0.0
        direcao      = None
    elif wpm < faixa_min:
        dentro_faixa = False
        desvio_pct   = (faixa_min - wpm) / faixa_min
        direcao      = "lento"
    elif wpm > faixa_max:
        dentro_faixa = False
        desvio_pct   = (wpm - faixa_max) / faixa_max
        direcao      = "rapido"
    else:
        dentro_faixa = True
        desvio_pct   = 0.0
        direcao      = None

    aprovado = dentro_faixa and precisao_ok

    if aprovado:
        status, subtipo = "aprovado", None
    elif not precisao_ok and not dentro_faixa:
        status, subtipo = "diretivo", "combinado"
    elif not precisao_ok:
        status, subtipo = "diretivo", "precisao"
    elif desvio_pct <= 0.15:
        status, subtipo = "aviso_suave", direcao
    else:
        status, subtipo = "diretivo", direcao

    feedback = _sortear(status, subtipo)

    return {
        "aprovado": aprovado,
        "status_feedback": {
            "status":     status,
            "subtipo":    subtipo,
            "titulo":     feedback["titulo"],
            "mensagem":   feedback["mensagem"],
            "wpm_obtido": round(wpm, 1),
            "faixa_min":  faixa_min if faixa_min > 0 else None,
            "faixa_max":  faixa_max if faixa_max < float("inf") else None,
            "precisao":   round(score_penalizado * 100, 1),
            "desvio_pct": round(desvio_pct * 100, 1),
        },
    }
