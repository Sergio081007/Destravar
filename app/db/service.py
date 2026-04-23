import random
from app.db.connection import get_connection

def fetch_text(perfil, dificuldade, ultimo_id=None, categoria=None, foco=None):
    conn = get_connection()
    cursor = conn.cursor()

    query = """
        SELECT id, externo_id, titulo, conteudo, tipo, categoria, dica,
               foco_terapeutico, sons_alvo, repeticoes_sugeridas
        FROM TrainingTexts
        WHERE perfil = ? AND dificuldade = ?
    """
    params = [perfil, dificuldade]

    if categoria:
        query += " AND categoria = ?"
        params.append(categoria)

    if foco:
        query += " AND (foco_terapeutico LIKE ? OR foco_terapeutico LIKE ?)"
        params.append('%' + foco + '%')
        params.append('%' + "respira" + '%') # Fallback para respiração se o foco falhar
    if ultimo_id:
        query += " AND id != ?"
        params.append(ultimo_id)

    cursor.execute(query, params)
    resultados = cursor.fetchall()

    cursor.close()
    conn.close()

    if not resultados:
        # Tentar buscar sem o foco para evitar que fique sem texto se não houver exato match
        if foco:
            return fetch_text(perfil, dificuldade, ultimo_id, categoria, foco=None)
        return None

    return dict(random.choice(resultados))