import json
import os
from dotenv import load_dotenv
from connection import get_connection

load_dotenv(os.path.join(os.path.dirname(__file__), '../../.env'))

JSON_PATH = os.path.join(os.path.dirname(__file__), '../../data/textos/textos-treinamento.json')


def seed():
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    supabase = get_connection()
    inseridos = 0
    pulados = 0

    # ── Texto de calibração ───────────────────────────────────────────────────
    cal = data['calibracao']
    existing = supabase.table("textos_calibracao").select("id").eq("id", cal['id']).execute()
    if existing.data:
        print(f"Calibração '{cal['id']}' já existe, pulando.")
        pulados += 1
    else:
        supabase.table("textos_calibracao").insert({
            "id":                    cal['id'],
            "titulo":                cal.get('titulo'),
            "conteudo":              cal['conteudo'],
            "palavras":              cal.get('palavras'),
            "instrucao_rapido":      cal['instrucoes']['rapido'],
            "instrucao_devagar":     cal['instrucoes']['devagar'],
            "instrucao_confortavel": cal['instrucoes']['confortavel'],
        }).execute()
        inseridos += 1
        print(f"Calibração '{cal['id']}' inserida.")

    # ── Trava-línguas (antes dos textos por causa da FK) ──────────────────────
    for tl in data['trava_linguas']:
        existing = supabase.table("trava_linguas").select("id").eq("id", tl['id']).execute()
        if existing.data:
            pulados += 1
            continue

        supabase.table("trava_linguas").insert({
            "id":          tl['id'],
            "fase_minima": tl.get('fase_minima'),
            "dificuldade": tl.get('dificuldade'),
            "titulo":      tl.get('titulo'),
            "conteudo":    tl['conteudo'],
            "sons_alvo":   tl.get('sons_alvo', []),
            "dica":        tl.get('dica'),
            "repeticoes":  tl.get('repeticoes'),
        }).execute()
        inseridos += 1

    print(f"Trava-línguas: {inseridos} inseridos até agora.")

    # ── Textos ────────────────────────────────────────────────────────────────
    for texto in data['textos']:
        existing = supabase.table("textos").select("id").eq("id", texto['id']).execute()
        if existing.data:
            pulados += 1
            continue

        supabase.table("textos").insert({
            "id":                  texto['id'],
            "fase":                texto.get('fase'),
            "dificuldade":         texto.get('dificuldade'),
            "titulo":              texto.get('titulo'),
            "conteudo":            texto['conteudo'],
            "palavras":            texto.get('palavras'),
            "ex2_wpm_min":         texto.get('ex2_wpm_min'),
            "ex2_wpm_max":         texto.get('ex2_wpm_max'),
            "ex2_dica":            texto.get('ex2_dica'),
            "ex3_som_alvo":        texto.get('ex3_som_alvo'),
            "ex3_instrucao":       texto.get('ex3_instrucao'),
            "ex3_exemplo_palavra": texto.get('ex3_exemplo_palavra'),
            "ex3_trava_lingua_id": texto.get('ex3_trava_lingua_id'),
        }).execute()
        inseridos += 1

    print(f"Seed concluído: {inseridos} inseridos, {pulados} pulados.")


if __name__ == "__main__":
    seed()
