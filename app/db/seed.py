import json
import os
from connection import get_connection

# Caminho do JSON
JSON_PATH = os.path.join(os.path.dirname(__file__), '../../data/textos/textos-treinamento.json')

def seed():
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    conn = get_connection()
    cursor = conn.cursor()

    inseridos = 0
    pulados = 0

    # Insere textos
    for texto in data['textos']:
        cursor.execute("SELECT id FROM TrainingTexts WHERE externo_id = %s", (texto['id'],))
        if cursor.fetchone():
            pulados += 1
            continue

        cursor.execute("""
            INSERT INTO TrainingTexts 
            (externo_id, perfil, conteudo, categoria, dificuldade, tipo, titulo, palavras, dica, foco_terapeutico, sons_alvo, repeticoes_sugeridas)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            texto['id'],
            texto['perfil'],
            texto['conteudo'],
            'texto',
            texto['dificuldade'],
            texto.get('tipo'),
            texto.get('titulo'),
            texto.get('palavras'),
            texto.get('dica'),
            texto.get('foco_terapeutico'),
            None,
            None
        ))
        inseridos += 1

    # Insere trava-línguas
    for tl in data['trava_linguas']:
        cursor.execute("SELECT id FROM TrainingTexts WHERE externo_id = %s", (tl['id'],))
        if cursor.fetchone():
            pulados += 1
            continue

        cursor.execute("""
            INSERT INTO TrainingTexts 
            (externo_id, perfil, conteudo, categoria, dificuldade, tipo, titulo, palavras, dica, foco_terapeutico, sons_alvo, repeticoes_sugeridas)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            tl['id'],
            tl['perfil'],
            tl['conteudo'],
            'trava_lingua',
            tl['dificuldade'],
            None,
            tl.get('titulo'),
            tl.get('palavras'),
            tl.get('dica'),
            None,
            json.dumps(tl.get('sons_alvo')),
            tl.get('repeticoes_sugeridas')
        ))
        inseridos += 1

    conn.commit()
    cursor.close()
    conn.close()

    print(f"Seed concluído: {inseridos} inseridos, {pulados} pulados.")

if __name__ == "__main__":
    seed()