import json
import os
from dotenv import load_dotenv
from connection import get_connection


JSON_PATH = os.path.join(os.path.dirname(__file__), '../../data/textos/textos-treinamento.json')


def seed():
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    supabase = get_connection()
    inseridos = 0
    pulados = 0

    # ── Textos ────────────────────────────────────────────────────────────────
    for texto in data['textos']:
        # Checa se já existe pelo externo_id
        existing = (
            supabase.table("TrainingTexts")
            .select("id")
            .eq("externo_id", texto['id'])
            .execute()
        )
        if existing.data:
            pulados += 1
            continue

        ex2 = texto.get('exercicio_2', {})
        ex3 = texto.get('exercicio_3', {})
        wpm = ex2.get('wpm_alvo', {})

        supabase.table("TrainingTexts").insert({
            "externo_id":            texto['id'],
            "perfil":                texto.get('perfil'),
            "fase":                  texto.get('fase'),
            "conteudo":              texto['conteudo'],
            "categoria":             'texto',
            "dificuldade":           texto.get('dificuldade'),
            "titulo":                texto.get('titulo'),
            "palavras":              texto.get('palavras'),
            "ex2_dica_velocidade":   ex2.get('dica_velocidade'),
            "ex2_wpm_min":           wpm.get('min'),
            "ex2_wpm_max":           wpm.get('max'),
            "ex3_som_alvo":          ex3.get('som_alvo'),
            "ex3_instrucao":         ex3.get('instrucao'),
            "ex3_exemplo_palavra":   ex3.get('exemplo_palavra'),
            "ex3_nivel_suavizacao":  ex3.get('nivel_suavizacao'),
            "ex3_trava_lingua_id":   ex3.get('trava_lingua_id'),
        }).execute()
        inseridos += 1

    # ── Trava-línguas ─────────────────────────────────────────────────────────
    for tl in data['trava_linguas']:
        existing = (
            supabase.table("TrainingTexts")
            .select("id")
            .eq("externo_id", tl['id'])
            .execute()
        )
        if existing.data:
            pulados += 1
            continue

        supabase.table("TrainingTexts").insert({
            "externo_id":            tl['id'],
            "conteudo":              tl['conteudo'],
            "categoria":             'trava_lingua',
            "dificuldade":           tl.get('dificuldade'),
            "titulo":                tl.get('titulo'),
            "sons_alvo":             json.dumps(tl.get('sons_alvo'), ensure_ascii=False),
            "repeticoes_sugeridas":  tl.get('repeticoes_sugeridas'),
            "fase_minima":           tl.get('fase_minima'),
            "dica":                  tl.get('dica'),
        }).execute()
        inseridos += 1

    print(f"Seed concluído: {inseridos} inseridos, {pulados} pulados.")


if __name__ == "__main__":
    seed()