import json
import random
from connection import get_connection


def _row_to_dict(row):
    """Converte Row em dict e desserializa sons_alvo de JSON string."""
    d = dict(row)
    if d.get('sons_alvo'):
        try:
            d['sons_alvo'] = json.loads(d['sons_alvo'])
        except (json.JSONDecodeError, TypeError):
            pass
    return d


def fetch_text(perfil, dificuldade, fase=None, ultimo_id=None):
    """
    Busca um texto aleatório de treino.

    Parâmetros:
        perfil      – 'gagueira' | 'fala_rapida' | 'misto'
        dificuldade – 'facil' | 'medio' | 'dificil'
        fase        – (opcional) filtra pela fase exata
        ultimo_id   – (opcional) exclui o último texto usado (evita repetição)
    """
    conn = get_connection()
    cursor = conn.cursor()

    query = """
        SELECT id, externo_id, perfil, fase, titulo, conteudo, dificuldade,
               ex2_dica_velocidade, ex2_wpm_min, ex2_wpm_max,
               ex3_som_alvo, ex3_instrucao, ex3_exemplo_palavra,
               ex3_nivel_suavizacao, ex3_trava_lingua_id
        FROM TrainingTexts
        WHERE categoria = 'texto'
          AND perfil = ?
          AND dificuldade = ?
    """
    params = [perfil, dificuldade]

    if fase is not None:
        query += " AND fase = ?"
        params.append(fase)

    if ultimo_id:
        query += " AND id != ?"
        params.append(ultimo_id)

    cursor.execute(query, params)
    resultados = cursor.fetchall()
    cursor.close()
    conn.close()

    if not resultados:
        return None

    return _row_to_dict(random.choice(resultados))


def fetch_trava_lingua(trava_lingua_id=None, dificuldade=None, fase_atual=None, ultimo_id=None):
    """
    Busca um trava-língua.

    Parâmetros:
        trava_lingua_id – busca por ID externo específico (ex: 'tl_002')
        dificuldade     – filtra por dificuldade quando não há ID específico
        fase_atual      – respeita o campo fase_minima do trava-língua
        ultimo_id       – exclui o último usado
    """
    conn = get_connection()
    cursor = conn.cursor()

    if trava_lingua_id:
        cursor.execute("""
            SELECT id, externo_id, titulo, conteudo, dificuldade,
                   sons_alvo, repeticoes_sugeridas, fase_minima, dica
            FROM TrainingTexts
            WHERE categoria = 'trava_lingua' AND externo_id = ?
        """, (trava_lingua_id,))
        row = cursor.fetchone()
        cursor.close()
        conn.close()
        return _row_to_dict(row) if row else None

    query = """
        SELECT id, externo_id, titulo, conteudo, dificuldade,
               sons_alvo, repeticoes_sugeridas, fase_minima, dica
        FROM TrainingTexts
        WHERE categoria = 'trava_lingua'
    """
    params = []

    if dificuldade:
        query += " AND dificuldade = ?"
        params.append(dificuldade)

    if fase_atual is not None:
        query += " AND (fase_minima IS NULL OR fase_minima <= ?)"
        params.append(fase_atual)

    if ultimo_id:
        query += " AND id != ?"
        params.append(ultimo_id)

    cursor.execute(query, params)
    resultados = cursor.fetchall()
    cursor.close()
    conn.close()

    if not resultados:
        return None

    return _row_to_dict(random.choice(resultados))