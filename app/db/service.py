import random
from app.db.connection import get_connection


def fetch_texto(fase: int, ultimo_id: str = None) -> dict | None:
    """
    Busca o texto de treino de uma fase específica.

    Parâmetros:
        fase       – número da fase (1 a 10)
        ultimo_id  – (opcional) exclui o último texto usado (evita repetição)
    """
    supabase = get_connection()

    query = (
        supabase.table("textos")
        .select(
            "id, fase, dificuldade, titulo, conteudo, palavras, "
            "ex2_wpm_min, ex2_wpm_max, ex2_dica, "
            "ex3_som_alvo, ex3_instrucao, ex3_exemplo_palavra, ex3_trava_lingua_id"
        )
        .eq("fase", fase)
    )

    if ultimo_id:
        query = query.neq("id", ultimo_id)

    response = query.execute()
    resultados = response.data

    if not resultados:
        return None

    return random.choice(resultados)


def fetch_trava_lingua(trava_lingua_id: str = None, fase_atual: int = None, ultimo_id: str = None) -> dict | None:
    """
    Busca um trava-língua.

    Parâmetros:
        trava_lingua_id – busca por ID específico (ex: 'tl_002')
        fase_atual      – respeita o campo fase_minima
        ultimo_id       – exclui o último usado
    """
    supabase = get_connection()

    cols = "id, fase_minima, dificuldade, titulo, conteudo, sons_alvo, dica, repeticoes"

    if trava_lingua_id:
        response = (
            supabase.table("trava_linguas")
            .select(cols)
            .eq("id", trava_lingua_id)
            .single()
            .execute()
        )
        return response.data if response.data else None

    query = supabase.table("trava_linguas").select(cols)

    if fase_atual is not None:
        query = query.or_(f"fase_minima.is.null,fase_minima.lte.{fase_atual}")

    if ultimo_id:
        query = query.neq("id", ultimo_id)

    response = query.execute()
    resultados = response.data

    if not resultados:
        return None

    return random.choice(resultados)


def fetch_texto_calibracao() -> dict | None:
    """
    Busca o texto de calibração do banco.
    """
    supabase = get_connection()

    response = (
        supabase.table("textos_calibracao")
        .select("*")
        .eq("id", "texto_calibracao")
        .single()
        .execute()
    )

    return response.data if response.data else None