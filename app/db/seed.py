import json
import os
from connection import get_connection

JSON_PATH = os.path.join(os.path.dirname(__file__), '../../data/textos/textos-treinamento.json')


def criar_tabela():
    conn = get_connection()
    cursor = conn.cursor()

    # Textos de treinamento
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS TrainingTexts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            externo_id TEXT UNIQUE,
            perfil TEXT,
            fase INTEGER,
            conteudo TEXT,
            categoria TEXT,         -- 'texto' | 'trava_lingua'
            dificuldade TEXT,
            titulo TEXT,
            palavras INTEGER,

            -- Exercício 2 (velocidade/WPM)
            ex2_dica_velocidade TEXT,
            ex2_wpm_min INTEGER,
            ex2_wpm_max INTEGER,

            -- Exercício 3 (suavização)
            ex3_som_alvo TEXT,
            ex3_instrucao TEXT,
            ex3_exemplo_palavra TEXT,
            ex3_nivel_suavizacao TEXT,
            ex3_trava_lingua_id TEXT,   -- preenchido quando som_alvo = 'trava_lingua'

            -- Trava-línguas: campos específicos
            sons_alvo TEXT,             -- JSON array, ex: ["p", "b"]
            repeticoes_sugeridas INTEGER,
            fase_minima INTEGER,
            dica TEXT,

            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    cursor.close()
    conn.close()


def seed():
    criar_tabela()

    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    conn = get_connection()
    cursor = conn.cursor()

    inseridos = 0
    pulados = 0

    # ── Textos ────────────────────────────────────────────────────────────────
    for texto in data['textos']:
        cursor.execute("SELECT id FROM TrainingTexts WHERE externo_id = ?", (texto['id'],))
        if cursor.fetchone():
            pulados += 1
            continue

        ex2 = texto.get('exercicio_2', {})
        ex3 = texto.get('exercicio_3', {})
        wpm = ex2.get('wpm_alvo', {})

        cursor.execute("""
            INSERT INTO TrainingTexts (
                externo_id, perfil, fase, conteudo, categoria, dificuldade, titulo, palavras,
                ex2_dica_velocidade, ex2_wpm_min, ex2_wpm_max,
                ex3_som_alvo, ex3_instrucao, ex3_exemplo_palavra, ex3_nivel_suavizacao, ex3_trava_lingua_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            texto['id'],
            texto.get('perfil'),
            texto.get('fase'),
            texto['conteudo'],
            'texto',
            texto.get('dificuldade'),
            texto.get('titulo'),
            texto.get('palavras'),
            ex2.get('dica_velocidade'),
            wpm.get('min'),
            wpm.get('max'),
            ex3.get('som_alvo'),
            ex3.get('instrucao'),
            ex3.get('exemplo_palavra'),
            ex3.get('nivel_suavizacao'),
            ex3.get('trava_lingua_id'),
        ))
        inseridos += 1

    # ── Trava-línguas ─────────────────────────────────────────────────────────
    for tl in data['trava_linguas']:
        cursor.execute("SELECT id FROM TrainingTexts WHERE externo_id = ?", (tl['id'],))
        if cursor.fetchone():
            pulados += 1
            continue

        cursor.execute("""
            INSERT INTO TrainingTexts (
                externo_id, conteudo, categoria, dificuldade, titulo,
                sons_alvo, repeticoes_sugeridas, fase_minima, dica
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            tl['id'],
            tl['conteudo'],
            'trava_lingua',
            tl.get('dificuldade'),
            tl.get('titulo'),
            json.dumps(tl.get('sons_alvo'), ensure_ascii=False),
            tl.get('repeticoes_sugeridas'),
            tl.get('fase_minima'),
            tl.get('dica'),
        ))
        inseridos += 1

    conn.commit()
    cursor.close()
    conn.close()

    print(f"Seed concluído: {inseridos} inseridos, {pulados} pulados.")


if __name__ == "__main__":
    seed()