import random
from connection import get_connection

def fetch_text(perfil, dificuldade, ultimo_id=None):
    conn = get_connection()
    cursor = conn.cursor()

    query = """
        SELECT id, externo_id, titulo, conteudo, tipo, categoria, dica,
               foco_terapeutico, sons_alvo, repeticoes_sugeridas
        FROM TrainingTexts
        WHERE perfil = ? AND dificuldade = ?
    """
    params = [perfil, dificuldade]

    if ultimo_id:
        query += " AND id != ?"
        params.append(ultimo_id)

    cursor.execute(query, params)
    resultados = cursor.fetchall()

    cursor.close()
    conn.close()

    if not resultados:
        return None

    return dict(random.choice(resultados))