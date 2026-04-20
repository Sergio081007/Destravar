import random
from connection import get_connection

def fetch_text(perfil, dificuldade, ultimo_id=None): #ultimo_id é para garantir que não vai repetir o texto consecutivamente
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    query = """
        SELECT id, externo_id, titulo, conteudo, tipo, categoria, dica, 
               foco_terapeutico, sons_alvo, repeticoes_sugeridas
        FROM TrainingTexts
        WHERE perfil = %s AND dificuldade = %s
    """
    params = [perfil, dificuldade]

    #se passar a id do último texto exibido a query exclui ele para reafirmar que não recebe o texto 2x seguidas
    if ultimo_id:
        query += " AND id != %s"
        params.append(ultimo_id)

    cursor.execute(query, params)
    resultados = cursor.fetchall()

    cursor.close()
    conn.close()

    if not resultados:
        return None

    #pega todos os textos que passaram nos filtros e sorteia aleatoriamente
    return random.choice(resultados)