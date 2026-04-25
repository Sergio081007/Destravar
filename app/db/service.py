import json
import random
from connection import get_connection


def _deserialize(row: dict) -> dict:
    """Desserializa sons_alvo se vier como string JSON."""
    if row and isinstance(row.get('sons_alvo'), str):
        try:
            row['sons_alvo'] = json.loads(row['sons_alvo'])
        except (json.JSONDecodeError, TypeError):
            pass
    return row


def fetch_text(perfil, dificuldade, fase=None, ultimo_id=None):
    """
    Busca um texto aleatório de treino.

    Parâmetros:
        perfil      – 'gagueira' | 'fala_rapida' | 'misto'
        dificuldade – 'facil' | 'medio' | 'dificil'
        fase        – (opcional) filtra pela fase exata
        ultimo_id   – (opcional) exclui o último texto usado (evita repetição)
    """
    supabase = get_connection()

    query = (
        supabase.table("TrainingTexts")
        .select(
            "id, externo_id, perfil, fase, titulo, conteudo, dificuldade, "
            "ex2_dica_velocidade, ex2_wpm_min, ex2_wpm_max, "
            "ex3_som_alvo, ex3_instrucao, ex3_exemplo_palavra, "
            "ex3_nivel_suavizacao, ex3_trava_lingua_id"
        )
        .eq("categoria", "texto")
        .eq("perfil", perfil)
        .eq("dificuldade", dificuldade)
    )

    if fase is not None:
        query = query.eq("fase", fase)

    if ultimo_id:
        query = query.neq("id", ultimo_id)

    response = query.execute()
    resultados = response.data

    if not resultados:
        return None

    return _deserialize(random.choice(resultados))


def fetch_trava_lingua(trava_lingua_id=None, dificuldade=None, fase_atual=None, ultimo_id=None):
    """
    Busca um trava-língua.

    Parâmetros:
        trava_lingua_id – busca por ID externo específico (ex: 'tl_002')
        dificuldade     – filtra por dificuldade quando não há ID específico
        fase_atual      – respeita o campo fase_minima do trava-língua
        ultimo_id       – exclui o último usado
    """
    supabase = get_connection()

    cols = (
        "id, externo_id, titulo, conteudo, dificuldade, "
        "sons_alvo, repeticoes_sugeridas, fase_minima, dica"
    )

    if trava_lingua_id:
        response = (
            supabase.table("TrainingTexts")
            .select(cols)
            .eq("categoria", "trava_lingua")
            .eq("externo_id", trava_lingua_id)
            .single()
            .execute()
        )
        return _deserialize(response.data) if response.data else None

    query = (
        supabase.table("TrainingTexts")
        .select(cols)
        .eq("categoria", "trava_lingua")
    )

    if dificuldade:
        query = query.eq("dificuldade", dificuldade)

    if fase_atual is not None:
        # fase_minima IS NULL OR fase_minima <= fase_atual
        query = query.or_(f"fase_minima.is.null,fase_minima.lte.{fase_atual}")

    if ultimo_id:
        query = query.neq("id", ultimo_id)

    response = query.execute()
    resultados = response.data

    if not resultados:
        return None

    return _deserialize(random.choice(resultados))